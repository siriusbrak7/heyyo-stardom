// components/UpgradeModal.tsx
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Zap, Crown, Sparkles, AlertCircle, CreditCard } from 'lucide-react';
import { PlanTier, PricingTier } from '../types';
import { PRICING_TIERS } from '../constants';
import { subscriptionService } from '../services/subscriptionService';
import { getCurrentUser } from '../services/authService';
import PaystackModal from './PaystackModal';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess?: (newPlan: PlanTier) => void;
  currentPlan?: PlanTier;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpgradeSuccess,
  currentPlan = 'Basic'
}) => {
  const [availablePlans, setAvailablePlans] = useState<PricingTier[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailablePlans();
      loadSubscriptionDetails();
    }
  }, [isOpen, currentPlan]);

  const loadAvailablePlans = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const upgrades = await subscriptionService.getAvailableUpgrades(user.id);
    const available = PRICING_TIERS.filter(tier => 
      upgrades.includes(tier.name) || tier.name === currentPlan
    );
    setAvailablePlans(available);
  };

  const loadSubscriptionDetails = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const details = await subscriptionService.getSubscriptionDetails(user.id);
    setSubscriptionDetails(details);
  };

  const handleUpgrade = (plan: PlanTier) => {
    if (plan === currentPlan) {
      setError(`You're already on the ${plan} plan`);
      return;
    }

    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    const user = await getCurrentUser();
    if (!user) return;

    // In real implementation, this would be called via webhook
    // For now, we simulate successful upgrade
    setTimeout(() => {
      setLoading(false);
      onUpgradeSuccess?.(selectedPlan);
      onClose();
      alert(`Successfully upgraded to ${selectedPlan}!`);
    }, 1500);
  };

  if (!isOpen) return null;

  const getPlanIcon = (plan: PlanTier) => {
    switch (plan) {
      case 'Basic': return <Zap className="w-6 h-6" />;
      case 'Pro': return <Sparkles className="w-6 h-6" />;
      case 'Exclusive': return <Crown className="w-6 h-6" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[2000] flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="glass rounded-3xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-8 text-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black italic">Upgrade Your Plan</h2>
                  <p className="opacity-90">Unlock more features and higher download limits</p>
                </div>
                <div className="bg-black/30 px-4 py-2 rounded-xl">
                  <span className="text-sm">Current: </span>
                  <span className="font-bold">{currentPlan}</span>
                </div>
              </div>

              {subscriptionDetails && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black/30 p-4 rounded-xl">
                    <p className="text-sm opacity-90">Status</p>
                    <p className="font-bold text-lg">
                      {subscriptionDetails.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                    </p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl">
                    <p className="text-sm opacity-90">Last Payment</p>
                    <p className="font-bold text-lg">
                      {subscriptionDetails.lastPayment 
                        ? new Date(subscriptionDetails.lastPayment).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl">
                    <p className="text-sm opacity-90">Next Billing</p>
                    <p className="font-bold text-lg">
                      {subscriptionDetails.nextBilling 
                        ? new Date(subscriptionDetails.nextBilling).toLocaleDateString()
                        : 'None'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-8">
              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* Available Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {availablePlans.map((tier) => {
                  const isCurrent = tier.name === currentPlan;
                  const isUpgrade = tier.name !== currentPlan;
                  const isRecommended = tier.name === 'Pro';

                  return (
                    <div
                      key={tier.name}
                      className={`relative flex flex-col p-6 rounded-2xl transition-all duration-300 ${
                        isCurrent
                          ? 'ring-2 ring-yellow-500 bg-yellow-500/10'
                          : isRecommended
                          ? 'bg-gradient-to-b from-blue-500/10 to-black border-2 border-blue-500'
                          : 'bg-white/5 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                          Recommended
                        </div>
                      )}

                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                          Current Plan
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isCurrent ? 'bg-yellow-500 text-black' :
                          isRecommended ? 'bg-blue-500 text-white' :
                          'bg-white/10 text-white'
                        }`}>
                          {getPlanIcon(tier.name)}
                        </div>
                        <div>
                          <h3 className="text-xl font-black">{tier.name}</h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black">${tier.price}</span>
                            <span className="text-gray-500 text-sm">/month</span>
                          </div>
                        </div>
                      </div>

                      <ul className="flex-1 space-y-3 mb-6">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleUpgrade(tier.name)}
                        disabled={isCurrent || loading}
                        className={`w-full py-3 rounded-xl font-bold transition-all ${
                          isCurrent
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : isRecommended
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:shadow-lg'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isCurrent ? 'Current Plan' : `Upgrade to ${tier.name}`}
                      </button>

                      {tier.badge && !isCurrent && (
                        <p className="text-center text-xs text-gray-500 mt-3">
                          {tier.badge}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Comparison Table */}
              <div className="border-t border-white/10 pt-8">
                <h3 className="text-xl font-bold mb-6 text-center">Plan Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full glass rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="p-4 text-left">Feature</th>
                        <th className="p-4 text-center">Basic</th>
                        <th className="p-4 text-center">Pro</th>
                        <th className="p-4 text-center">Exclusive</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="p-4">Monthly Downloads</td>
                        <td className="p-4 text-center">30</td>
                        <td className="p-4 text-center">Unlimited</td>
                        <td className="p-4 text-center">Unlimited</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-4">Audio Formats</td>
                        <td className="p-4 text-center">MP3 Only</td>
                        <td className="p-4 text-center">MP3 + WAV</td>
                        <td className="p-4 text-center">All + Stems</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-4">Commercial Rights</td>
                        <td className="p-4 text-center">Personal Use</td>
                        <td className="p-4 text-center">Basic Commercial</td>
                        <td className="p-4 text-center">Full Commercial</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-4">Exclusive Beats</td>
                        <td className="p-4 text-center">❌</td>
                        <td className="p-4 text-center">❌</td>
                        <td className="p-4 text-center">✅</td>
                      </tr>
                      <tr>
                        <td className="p-4">Priority Support</td>
                        <td className="p-4 text-center">❌</td>
                        <td className="p-4 text-center">✅</td>
                        <td className="p-4 text-center">✅ 24/7</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cancel Subscription */}
              {currentPlan !== 'Basic' && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold mb-2">Manage Subscription</h4>
                      <p className="text-sm text-gray-400">
                        Cancel anytime. You'll keep access until the end of your billing period.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel your subscription? You will be downgraded to Basic plan.')) {
                          subscriptionService.cancelSubscription('');
                          onClose();
                        }
                      }}
                      className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/20 transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && showPayment && (
        <PaystackModal
          plan={selectedPlan}
          price={PRICING_TIERS.find(t => t.name === selectedPlan)?.price || '0'}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
};

export default UpgradeModal;