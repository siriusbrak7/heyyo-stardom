import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle, Shield, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { PlanTier } from '../types';
import { supabase } from '../supabase';

interface PaystackModalProps {
  plan: PlanTier;
  price: string;
  onSuccess: () => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const PaystackModal: React.FC<PaystackModalProps> = ({ plan, price, onSuccess, onClose }) => {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [userPlan, setUserPlan] = useState<PlanTier>('Basic');

  useEffect(() => {
    loadUserPlan();
    loadPaystackScript();
  }, []);

  const loadUserPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_tier')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserPlan(profile.plan_tier);
        setUserEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
    }
  };

  const loadPaystackScript = () => {
    if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onerror = () => {
      setErrorMessage('Payment processor failed to load. Please refresh the page.');
      setStep('error');
    };
    document.body.appendChild(script);
  };

  const getPlanDetails = () => {
    switch (plan) {
      case 'Basic':
        return {
          features: ['MP3 Downloads', '30 Downloads/Month', 'Personal use only', 'No commercial rights'],
          color: 'from-blue-600 to-blue-500'
        };
      case 'Pro':
        return {
          features: ['MP3 + High-Res WAV', 'Unlimited Downloads', 'Basic Commercial Rights', 'Up to 100k streams'],
          color: 'from-purple-600 to-purple-500'
        };
      case 'Exclusive':
        return {
          features: ['All Formats + Stems', 'Exclusive Beats included', 'Full Commercial Rights', 'Unlimited Streams'],
          color: 'from-yellow-600 to-orange-600'
        };
      default:
        return { features: [], color: 'from-gray-600 to-gray-500' };
    }
  };

  const validateUpgrade = (): string | null => {
    const planOrder = ['Basic', 'Pro', 'Exclusive'];
    const currentIndex = planOrder.indexOf(userPlan);
    const targetIndex = planOrder.indexOf(plan);

    if (currentIndex > targetIndex) {
      return `You are already on ${userPlan} plan which includes all ${plan} features`;
    }
    
    if (currentIndex === targetIndex) {
      return `You are already on the ${plan} plan`;
    }

    return null;
  };

  const calculateAmount = () => {
    const numericPrice = parseFloat(price.replace('$', '').replace(/,/g, ''));
    return Math.floor(numericPrice * 100); // Convert dollars to cents/kobo
  };

  const initializePayment = async () => {
    const validationError = validateUpgrade();
    if (validationError) {
      setErrorMessage(validationError);
      return false;
    }

    if (!userEmail || !userEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }

    if (!window.PaystackPop) {
      setErrorMessage('Payment processor is loading, please try again in a moment');
      return false;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Generate a unique reference
      const reference = `PSK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const amountInKobo = calculateAmount();
      
      // Validate amount
      if (amountInKobo < 100) { // Minimum 100 kobo = $1
        setErrorMessage('Invalid payment amount');
        setStep('error');
        setLoading(false);
        return false;
      }

      // Get Paystack public key from environment
      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      
      if (!paystackKey || paystackKey.includes('your_public_key')) {
        setErrorMessage('Payment configuration error. Please contact support.');
        setStep('error');
        setLoading(false);
        return false;
      }

      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: userEmail,
        amount: amountInKobo,
        ref: reference,
        currency: 'USD',
        metadata: {
          plan: plan,
          price: price,
          timestamp: new Date().toISOString(),
          user_id: (await supabase.auth.getUser()).data.user?.id
        },
        callback: function(response: any) {
          // This MUST be a regular function, not async
          verifyPayment(response.reference)
            .then(verificationResponse => {
              if (verificationResponse.success) {
                return updateUserPlan();
              } else {
                throw new Error(verificationResponse.message || 'Payment verification failed');
              }
            })
            .then(() => {
              setStep('success');
              setTimeout(() => {
                onSuccess();
              }, 2000);
            })
            .catch(error => {
              console.error('Payment verification error:', error);
              setErrorMessage(error.message || 'Payment verification failed. Please contact support.');
              setStep('error');
            })
            .finally(() => {
              setLoading(false);
            });
        },
        onClose: function() {
          setLoading(false);
          setStep('form');
        }
      });

      handler.openIframe();
      return true;
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      setErrorMessage(error.message || 'Payment initialization failed. Please try again.');
      setStep('error');
      setLoading(false);
      return false;
    }
  };

  const verifyPayment = async (reference: string): Promise<{ success: boolean; message: string }> => {
    try {
      // In production, call your backend to verify payment
      // For now, simulate successful verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'Payment verified successfully'
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed'
      };
    }
  };

  const updateUserPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update({
          plan_tier: plan,
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user plan:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception updating user plan:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (plan === 'Basic') {
      setLoading(true);
      setStep('processing');
      
      try {
        await updateUserPlan();
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } catch (error) {
        setErrorMessage('Failed to update plan');
        setStep('error');
      } finally {
        setLoading(false);
      }
    } else {
      await initializePayment();
    }
  };

  const handleRetry = () => {
    setStep('form');
    setErrorMessage('');
  };

  const planDetails = getPlanDetails();

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[2000] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white z-10"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="glass rounded-3xl overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${planDetails.color} p-8 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-black italic">Complete Your Purchase</h2>
                <p className="opacity-90 text-sm">Secure payment powered by Paystack</p>
              </div>
              <Shield className="w-10 h-10 opacity-80" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">${price}</span>
              <span className="opacity-90 text-sm">/month • {plan} Plan</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {step === 'form' && (
              <>
                {errorMessage && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{errorMessage}</p>
                  </div>
                )}

                {/* Current Plan Warning */}
                {userPlan !== 'Basic' && (
                  <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-sm text-yellow-400 font-medium">Current Plan: {userPlan}</p>
                        <p className="text-xs text-yellow-500 mt-1">
                          Upgrading will replace your current plan
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span className="text-gray-400">256-bit SSL secured connection</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-400">Cancel anytime • No hidden fees</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="producer@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 disabled:opacity-50"
                      required
                      disabled={loading || !!userEmail}
                    />
                    <p className="text-xs text-gray-500 mt-2">Receipt and login details will be sent here</p>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {plan} Plan Includes:
                    </h4>
                    <ul className="space-y-2">
                      {planDetails.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !userEmail}
                    className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-3 ${
                      loading || !userEmail
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:shadow-2xl hover:shadow-yellow-500/30 active:scale-95'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    {loading 
                      ? 'Processing...' 
                      : plan === 'Basic' 
                        ? 'Confirm Free Plan' 
                        : `Pay $${price} Now`
                    }
                  </button>

                  <p className="text-center text-xs text-gray-500">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                  </p>
                </form>
              </>
            )}

            {step === 'processing' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h3 className="text-xl font-black mb-2">Processing Payment</h3>
                  <p className="text-gray-500">Please wait while we secure your transaction...</p>
                </div>
                <p className="text-sm text-gray-600">Do not close this window</p>
              </div>
            )}

            {step === 'success' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2">
                    {plan === 'Basic' ? 'Registration Successful!' : 'Payment Successful!'}
                  </h3>
                  <p className="text-gray-500">Welcome to Curry Stardom {plan} tier</p>
                </div>
                <div className="text-sm text-gray-600 animate-pulse">
                  Redirecting to your dashboard...
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2">Payment Failed</h3>
                  <p className="text-gray-500 mb-4">{errorMessage || 'Something went wrong'}</p>
                  <button
                    onClick={handleRetry}
                    className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Test info - Only show in development */}
            {import.meta.env.DEV && plan !== 'Basic' && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <details className="text-sm">
                  <summary className="text-gray-500 cursor-pointer font-bold">Test Payment Information</summary>
                  <div className="mt-3 space-y-2 text-xs bg-black/20 p-3 rounded-lg">
                    <p><strong>Test Email:</strong> test@example.com</p>
                    <p><strong>Test Card:</strong> 5061 0666 6666 6666</p>
                    <p><strong>Test CVV:</strong> 123</p>
                    <p><strong>Test Expiry:</strong> Any future date</p>
                    <p className="text-yellow-500 text-xs">⚠️ Use test credentials only</p>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaystackModal;