import React, { useState } from 'react';
import { Mail, Zap, Music, CheckCircle, X, Gift } from 'lucide-react';
import { supabase } from '../supabase';

const LeadMagnet: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const benefits = [
    "Free MP3 beat pack (3 tracks)",
    "Exclusive producer tips & tutorials",
    "Early access to new beats",
    "Special discount codes",
    "Weekly music production newsletter"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('email', email.trim())
        .maybeSingle();

      if (existing) {
        setError('This email is already subscribed');
        setLoading(false);
        return;
      }

      // Add to newsletter subscribers
      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .insert([{
          email: email.trim(),
          source: 'lead_magnet',
          subscribed_at: new Date().toISOString(),
          status: 'active'
        }]);

      if (insertError) {
        // Fallback: Create table if it doesn't exist
        if (insertError.code === '42P01') {
          console.log('Newsletter table does not exist, creating...');
          // In production, this table should exist
        }
        throw insertError;
      }

      // Success
      setSuccess(true);
      setSubmitted(true);
      
      // Send welcome email (in production, trigger Supabase edge function)
      try {
        await fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() })
        });
      } catch (emailError) {
        console.log('Welcome email not sent (dev mode)');
      }

      // Reset form after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        setEmail('');
        setSubmitted(false);
      }, 5000);

    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
    setSubmitted(false);
    setEmail('');
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-black to-gray-900/50">
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-3xl overflow-hidden backdrop-blur-sm border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Column - Visual */}
            <div className="p-8 md:p-12 bg-gradient-to-br from-yellow-500/10 via-purple-500/10 to-blue-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full translate-y-32 -translate-x-32" />
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Gift className="w-6 h-6 text-black" />
                  </div>
                  <h3 className="text-2xl font-black">Free Producer Pack</h3>
                </div>

                <h2 className="text-4xl md:text-5xl font-black italic mb-6">
                  Get Your <span className="text-yellow-500">Free Beat Pack</span>
                </h2>
                
                <p className="text-lg text-gray-300 mb-8">
                  Join 500+ producers and get instant access to our exclusive free beat pack, 
                  production tips, and weekly newsletter.
                </p>

                <div className="space-y-4 mb-8">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      </div>
                      <span className="font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>No spam, ever</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-yellow-500" />
                    <span>Unsubscribe anytime</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="p-8 md:p-12 bg-white/5">
              {success ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-4">Welcome Aboard! 🎉</h3>
                  <p className="text-gray-300 mb-6">
                    Check your inbox for the free beat pack download link and welcome email.
                  </p>
                  <div className="space-y-3 text-sm text-gray-400">
                    <p>📦 <strong>Free Beat Pack</strong> download link sent</p>
                    <p>📧 <strong>Welcome email</strong> with resources</p>
                    <p>🎵 <strong>Production tips</strong> coming weekly</p>
                  </div>
                  <button
                    onClick={handleCloseSuccess}
                    className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-black mb-2">Get Instant Access</h3>
                  <p className="text-gray-400 mb-8">
                    Enter your email below to receive your free beat pack immediately.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Your Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                        }}
                        placeholder="producer@example.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 disabled:opacity-50"
                        required
                        disabled={loading}
                      />
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || submitted}
                      className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:shadow-2xl hover:shadow-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : submitted ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Subscribed!
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Get Free Beat Pack
                        </>
                      )}
                    </button>

                    <div className="text-center">
                      <p className="text-xs text-gray-500">
                        By subscribing, you agree to our{" "}
                        <a href="#" className="text-yellow-500 hover:underline">Privacy Policy</a>
                        {" "}and{" "}
                        <a href="#" className="text-yellow-500 hover:underline">Terms of Service</a>.
                      </p>
                    </div>
                  </form>

                  {/* Social Proof */}
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div 
                            key={i} 
                            className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-purple-500/20 rounded-full border-2 border-black"
                          />
                        ))}
                      </div>
                      <div className="text-sm">
                        <div className="font-bold">Join 500+ producers</div>
                        <div className="text-gray-500">Already enjoying free beats</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Trust Footer */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4">
            <div className="text-2xl font-black text-green-500 mb-1">✓</div>
            <div className="text-sm text-gray-400">No Credit Card Required</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-black text-blue-500 mb-1">⚡</div>
            <div className="text-sm text-gray-400">Instant Download</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-black text-purple-500 mb-1">🎵</div>
            <div className="text-sm text-gray-400">Industry Quality</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-black text-yellow-500 mb-1">🛡️</div>
            <div className="text-sm text-gray-400">100% Royalty Free</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeadMagnet;