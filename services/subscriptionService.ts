// services/subscriptionService.ts
import { supabase } from '../supabase';
import { PlanTier } from '../types';

export interface UpgradeResult {
  success: boolean;
  message: string;
  newPlan?: PlanTier;
  nextBillingDate?: string;
}

class SubscriptionService {
  // Upgrade user's subscription plan
  async upgradeUserPlan(
    userId: string, 
    newPlan: PlanTier,
    paymentReference: string,
    amount: number
  ): Promise<UpgradeResult> {
    try {
      // 1. Get current user
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return { success: false, message: 'User not found' };
      }

      const currentPlan = user.plan_tier as PlanTier;

      // 2. Validate upgrade (can't downgrade via this flow)
      if (this.getPlanLevel(newPlan) <= this.getPlanLevel(currentPlan)) {
        return { 
          success: false, 
          message: `You can only upgrade to a higher plan. Current: ${currentPlan}` 
        };
      }

      // 3. Record the payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          plan: newPlan,
          amount: amount,
          payment_reference: paymentReference,
          status: 'completed',
          previous_plan: currentPlan,
          payment_date: new Date().toISOString()
        });

      if (paymentError) {
        console.error('Payment recording error:', paymentError);
        return { success: false, message: 'Payment recording failed' };
      }

      // 4. Update user's plan
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan_tier: newPlan,
          subscription_status: 'active',
          last_payment_date: new Date().toISOString(),
          next_billing_date: this.getNextBillingDate()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Plan update error:', updateError);
        return { success: false, message: 'Plan update failed' };
      }

      // 5. Reset download count for upgraded users (Basic → Pro/Exclusive)
      if (currentPlan === 'Basic' && newPlan !== 'Basic') {
        await supabase
          .from('profiles')
          .update({ download_count_this_month: 0 })
          .eq('id', userId);
      }

      // 6. Log the upgrade
      await supabase
        .from('subscription_logs')
        .insert({
          user_id: userId,
          action: 'upgrade',
          from_plan: currentPlan,
          to_plan: newPlan,
          timestamp: new Date().toISOString()
        });

      // 7. Send email notification (you'd integrate with email service)
      await this.sendUpgradeEmail(user.email, currentPlan, newPlan);

      return {
        success: true,
        message: `Successfully upgraded to ${newPlan} plan!`,
        newPlan,
        nextBillingDate: this.getNextBillingDate()
      };

    } catch (error) {
      console.error('Upgrade error:', error);
      return { success: false, message: 'Upgrade failed. Please contact support.' };
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<UpgradeResult> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelled',
          plan_tier: 'Basic', // Downgrade to Basic on cancel
          next_billing_date: null
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase
        .from('subscription_logs')
        .insert({
          user_id: userId,
          action: 'cancel',
          timestamp: new Date().toISOString()
        });

      return {
        success: true,
        message: 'Subscription cancelled. You will keep access until the end of your billing period.'
      };
    } catch (error) {
      console.error('Cancel error:', error);
      return { success: false, message: 'Cancellation failed' };
    }
  }

  // Get user's subscription details
  async getSubscriptionDetails(userId: string) {
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('plan_tier, subscription_status, last_payment_date, next_billing_date')
        .eq('id', userId)
        .single();

      if (!user) return null;

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false })
        .limit(5);

      return {
        currentPlan: user.plan_tier,
        status: user.subscription_status || 'active',
        lastPayment: user.last_payment_date,
        nextBilling: user.next_billing_date,
        paymentHistory: payments || []
      };
    } catch (error) {
      console.error('Get subscription error:', error);
      return null;
    }
  }

  // Check if user can upgrade (for UI)
  async getAvailableUpgrades(userId: string): Promise<PlanTier[]> {
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('plan_tier')
        .eq('id', userId)
        .single();

      if (!user) return [];

      const currentPlan = user.plan_tier as PlanTier;
      const allPlans: PlanTier[] = ['Basic', 'Pro', 'Exclusive'];
      const currentLevel = this.getPlanLevel(currentPlan);

      return allPlans.filter(plan => this.getPlanLevel(plan) > currentLevel);
    } catch (error) {
      console.error('Get upgrades error:', error);
      return [];
    }
  }

  // services/subscriptionService.ts - Add free Basic plan method
async activateFreeBasicPlan(userId: string): Promise<UpgradeResult> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        plan_tier: 'Basic',
        subscription_status: 'active',
        download_count_this_month: 0 // Reset counter
      })
      .eq('id', userId);

    if (error) throw error;

    // Log the activation
    await supabase
      .from('subscription_logs')
      .insert({
        user_id: userId,
        action: 'activate',
        to_plan: 'Basic',
        timestamp: new Date().toISOString()
      });

    return {
      success: true,
      message: 'Free Basic plan activated! Enjoy 30 MP3 downloads this month.',
      newPlan: 'Basic'
    };
  } catch (error) {
    console.error('Activate free plan error:', error);
    return { success: false, message: 'Failed to activate free plan' };
  }
}

  // Handle webhook from Paystack (for recurring payments)
  async handlePaymentWebhook(payload: any) {
    try {
      const event = payload.event;
      const data = payload.data;

      switch (event) {
        case 'charge.success':
          await this.processSuccessfulCharge(data);
          break;
        case 'subscription.not_renew':
          await this.handleFailedRenewal(data);
          break;
        case 'transfer.success':
          // Handle affiliate payouts
          await this.processAffiliatePayout(data);
          break;
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook error:', error);
      return { success: false, error: error.message };
    }
  }

  // Private helper methods
  private getPlanLevel(plan: PlanTier): number {
    const levels = { 'Basic': 1, 'Pro': 2, 'Exclusive': 3 };
    return levels[plan];
  }

  private getNextBillingDate(): string {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  }

  private async sendUpgradeEmail(email: string, from: PlanTier, to: PlanTier) {
    // Integrate with your email service (Resend, SendGrid, etc.)
    console.log(`Upgrade email sent to ${email}: ${from} → ${to}`);
  }

  private async processSuccessfulCharge(data: any) {
    // Process successful payment
    const userId = data.metadata?.user_id;
    const plan = data.metadata?.plan as PlanTier;
    
    if (userId && plan) {
      await this.upgradeUserPlan(userId, plan, data.reference, data.amount / 100);
    }
  }

  private async handleFailedRenewal(data: any) {
    const userId = data.metadata?.user_id;
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'failed',
          next_billing_date: null
        })
        .eq('id', userId);
    }
  }

  private async processAffiliatePayout(data: any) {
    // Handle affiliate commission payouts
    const affiliateId = data.metadata?.affiliate_id;
    const amount = data.amount / 100;
    
    if (affiliateId) {
      await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliateId,
          amount: amount,
          status: 'completed',
          paid_at: new Date().toISOString()
        });
    }
  }
}

export const subscriptionService = new SubscriptionService();