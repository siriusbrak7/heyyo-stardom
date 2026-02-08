import { supabase } from '../supabase';
import { PlanTier } from '../types';

export interface DownloadStats {
  plan: PlanTier;
  usedThisMonth: number;
  maxDownloads: number;
  remaining: number;
  resetDate: string;
}

export interface DownloadPermission {
  allowed: boolean;
  reason: string;
  remaining: number;
  requiresUpgrade?: boolean;
}

export class DownloadService {
  async getUserDownloadStats(userId: string): Promise<DownloadStats | null> {
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('plan_tier, download_count_this_month')
        .eq('id', userId)
        .maybeSingle();

      if (error || !user) {
        console.error('User not found:', error?.message || 'No user data');
        return null;
      }

      const maxDownloads = this.getMaxDownloads(user.plan_tier);
      const used = user.download_count_this_month || 0;
      const remaining = Math.max(0, maxDownloads - used);

      return {
        plan: user.plan_tier,
        usedThisMonth: used,
        maxDownloads,
        remaining,
        resetDate: this.getNextResetDate()
      };
    } catch (error) {
      console.error('Error getting download stats:', error);
      return null;
    }
  }

  async canUserDownload(
    userId: string, 
    format: 'mp3' | 'wav' | 'stems', 
    beatLicenseTier: PlanTier
  ): Promise<DownloadPermission> {
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('plan_tier, download_count_this_month')
        .eq('id', userId)
        .maybeSingle();

      if (!user) {
        return {
          allowed: false,
          reason: 'User profile not found',
          remaining: 0,
          requiresUpgrade: false
        };
      }

      // Check if user's plan can access this beat
      const userPlanLevel = this.getPlanLevel(user.plan_tier);
      const beatPlanLevel = this.getPlanLevel(beatLicenseTier);
      
      if (userPlanLevel < beatPlanLevel) {
        return {
          allowed: false,
          reason: `This beat requires ${beatLicenseTier} plan or higher`,
          remaining: 0,
          requiresUpgrade: true
        };
      }

      // Check format permissions
      if (!this.canDownloadFormat(user.plan_tier, format)) {
        return {
          allowed: false,
          reason: `${format.toUpperCase()} downloads require ${this.getRequiredPlanForFormat(format)} plan`,
          remaining: 0,
          requiresUpgrade: true
        };
      }

      // Check download limits
      const stats = await this.getUserDownloadStats(userId);
      if (!stats) {
        return {
          allowed: false,
          reason: 'Could not verify download limits',
          remaining: 0,
          requiresUpgrade: false
        };
      }

      if (stats.remaining <= 0 && stats.maxDownloads !== Infinity) {
        return {
          allowed: false,
          reason: `Monthly download limit reached (${stats.maxDownloads}). Reset on ${stats.resetDate}`,
          remaining: 0,
          requiresUpgrade: user.plan_tier === 'Basic'
        };
      }

      return {
        allowed: true,
        reason: '',
        remaining: stats.remaining,
        requiresUpgrade: false
      };

    } catch (error) {
      console.error('Error checking download permission:', error);
      return {
        allowed: false,
        reason: 'System error checking download permissions',
        remaining: 0,
        requiresUpgrade: false
      };
    }
  }

  async recordDownload(
    userId: string, 
    beatId: string, 
    format: 'mp3' | 'wav' | 'stems'
  ): Promise<boolean> {
    try {
      // Record download in downloads table
      const { error: downloadError } = await supabase
        .from('downloads')
        .insert([{ 
          user_id: userId, 
          beat_id: beatId, 
          format,
          created_at: new Date().toISOString()
        }]);

      if (downloadError) {
        console.error('Error recording download:', downloadError);
        return false;
      }

      // Update download count in beats table
      const { error: beatError } = await supabase.rpc('increment_download', {
        beat_id: beatId,
        format_name: format
      });

      if (beatError) {
        console.error('Error updating beat download count:', beatError);
        // Don't return false here - download was recorded, just count update failed
      }

      // Update user's download count
      const { error: userError } = await supabase.rpc('increment_user_download', {
        user_id: userId
      });

      if (userError) {
        console.error('Error updating user download count:', userError);
        // Still return true - download was successful
      }

      return true;
    } catch (error) {
      console.error('Exception recording download:', error);
      return false;
    }
  }

  private getMaxDownloads(plan: PlanTier): number {
    switch (plan) {
      case 'Basic': return 30;
      case 'Pro': return Infinity;
      case 'Exclusive': return Infinity;
      default: return 0;
    }
  }

  private canDownloadFormat(plan: PlanTier, format: 'mp3' | 'wav' | 'stems'): boolean {
    switch (plan) {
      case 'Basic': return format === 'mp3';
      case 'Pro': return format === 'mp3' || format === 'wav';
      case 'Exclusive': return true;
      default: return false;
    }
  }

  private getRequiredPlanForFormat(format: 'mp3' | 'wav' | 'stems'): PlanTier {
    switch (format) {
      case 'mp3': return 'Basic';
      case 'wav': return 'Pro';
      case 'stems': return 'Exclusive';
    }
  }

  private getPlanLevel(plan: PlanTier): number {
    switch (plan) {
      case 'Basic': return 1;
      case 'Pro': return 2;
      case 'Exclusive': return 3;
      default: return 0;
    }
  }

  private getNextResetDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  }
}

export const downloadService = new DownloadService();