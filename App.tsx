import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Hero from "./components/Hero";
import BeatMarket from "./components/BeatMarket";
import SocialProof from "./components/SocialProof";
import LeadMagnet from "./components/LeadMagnet";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import PaystackModal from "./components/PaystackModal";
import ChatWidget from "./components/ChatWidget";
import AuthModal from "./components/AuthModal";
import { Menu, X, Disc, User as UserIcon, ShoppingBag, Bell, Check } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { PlanTier } from "./types";
import { PRICING_TIERS } from "./constants";
import { getCurrentUser, signOut, onAuthStateChange } from "./services/authService";
import { analyticsService } from "./services/analyticsService";
import { supabase } from "./supabase";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-8 max-w-md text-center">
            <h1 className="text-2xl font-black text-red-500 mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-6">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<"landing" | "dashboard" | "admin">("landing");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanTier | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Move ADMIN_EMAILS out of hot path so it isn't recreated on every render
  const ADMIN_EMAILS = useMemo(() => {
    return import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [
      'admin@heyyostardom.com',
      'admin@currystardom.com'
    ];
  }, []);

  // Track whether we've checked admin for a given user to avoid duplicate checks
  const hasCheckedAdminRef = useRef<string>('');

  // Remove the admin_users table check, use only env variable
const checkAdminStatus = useCallback(async (userId: string, userEmail: string): Promise<boolean> => {
  if (!userEmail) return false;

  // Skip if already checked for this user (avoids repetitive work)
  if (hasCheckedAdminRef.current === `${userId}-${userEmail}`) {
    return isAdmin; // return current known value
  }
  
  // Just check if email is in admin list
  const adminCheckResult = ADMIN_EMAILS.includes(userEmail.trim());
  
  // Only log in development and on first check
  if (import.meta.env.DEV) {
    console.log('Admin check:', { email: userEmail, isAdmin: adminCheckResult });
  }
  
  // Mark as checked
  hasCheckedAdminRef.current = `${userId}-${userEmail}`;

  return adminCheckResult;
}, [ADMIN_EMAILS, isAdmin]);

  const handleAuthSuccess = useCallback(async (user: SupabaseUser) => {
    setCurrentUser(user);
    
    if (user?.email) {
      const adminStatus = await checkAdminStatus(user.id, user.email);
      setIsAdmin(adminStatus);
      
      if (adminStatus) {
        setView('admin');
        window.history.replaceState({}, '', '/admin');
      } else {
        setView('dashboard');
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, [checkAdminStatus]);

  const upgradeToBasicPlan = useCallback(async () => {
  if (!currentUser) {
    setShowAuthModal(true);
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: currentUser.id,
        email: currentUser.email,
        plan_tier: 'Basic',
        subscription_status: 'active',
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) throw error;

    // Force a page reload to refresh the dashboard with new plan
    window.location.reload();
    
  } catch (error) {
    console.error('Exception upgrading to Basic:', error);
  }
}, [currentUser]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any;

    const initializeApp = async () => {
      try {
        const user = await getCurrentUser();
        if (!mounted) return;

        // Only proceed if user changed
        if (user?.id !== currentUser?.id) {
          setCurrentUser(user);

          if (user?.email) {
            const adminStatus = await checkAdminStatus(user.id, user.email);
            if (!mounted) return;
            setIsAdmin(adminStatus);

            const isAdminPath = window.location.pathname === '/admin';
            const isDashboardPath = window.location.pathname === '/dashboard';

            if (isAdminPath && adminStatus) {
              setView('admin');
            } else if (isDashboardPath) {
              setView('dashboard');
            } else {
              setView('landing');
            }
          } else {
            setView('landing');
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
        setView('landing');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // Only initialize if not already loading
    if (isLoading) {
      initializeApp();
    }

    const { data: authListener } = onAuthStateChange(async (user) => {
      if (!mounted) return;
      
      setCurrentUser(user);
      
      if (user?.email) {
        const adminStatus = await checkAdminStatus(user.id, user.email);
        setIsAdmin(adminStatus);
        
        if (adminStatus) {
          setView('admin');
          window.history.replaceState({}, '', '/admin');
        } else {
          setView('dashboard');
          window.history.replaceState({}, '', '/dashboard');
        }
      } else {
        setIsAdmin(false);
        setView('landing');
        window.history.replaceState({}, '', '/');
      }
    });

    authSubscription = authListener?.subscription;

    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin' && isAdmin && currentUser) {
        setView('admin');
      } else if (path === '/dashboard' && currentUser) {
        setView('dashboard');
      } else {
        setView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('popstate', handlePopState);
    };
    // Only checkAdminStatus
  }, [checkAdminStatus]);

  const handleStartPlan = useCallback((tier: PlanTier) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (tier === 'Basic') {
      upgradeToBasicPlan();
    } else {
      setCheckoutPlan(tier);
    }
  }, [currentUser, upgradeToBasicPlan]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      setCurrentUser(null);
      setIsAdmin(false);
      setView("landing");
      window.history.pushState({}, "", "/");
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "dashboard" && currentUser) {
    return (
      <Dashboard 
        user={currentUser} 
        onLogout={handleLogout}
        onUpgradePlan={() => {
          // Track analytics event (best-effort)
          try {
            analyticsService.trackEvent('click_upgrade_plan', { userId: currentUser?.id });
          } catch (e) {
            // Non-blocking
          }

          // Navigate to home page with pricing visible and scroll to plans
          setView("landing");
          window.history.pushState({}, "", "/");
          setTimeout(() => {
            document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }}
      />
    );
  }

  if (view === "admin" && isAdmin && currentUser) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {checkoutPlan && currentUser && (
        <PaystackModal
          plan={checkoutPlan}
          price={PRICING_TIERS.find(t => t.name === checkoutPlan)?.price || "0"}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={() => {
            setCheckoutPlan(null);
            setView('dashboard');
            window.history.pushState({}, '', '/dashboard');
          }}
        />
      )}

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              setView("landing");
              window.history.pushState({}, "", "/");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 group"
          >
            <Disc className="w-8 h-8 text-yellow-500 group-hover:rotate-180 transition-transform duration-500" />
            <div className="text-left leading-tight">
              <p className="font-black italic text-xl uppercase tracking-tighter">Heyyo Stardom</p>
              <p className="text-[10px] font-bold text-gray-600 tracking-widest">Professional Beats</p>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-8">
            <a href="#marketplace" className="font-bold hover:text-yellow-500 transition-colors">Marketplace</a>
            <a href="#plans" className="font-bold hover:text-yellow-500 transition-colors">Pricing</a>
            {isAdmin && (
              <button
                onClick={() => setView("admin")}
                className="font-bold text-red-500 hover:text-red-400 transition-colors"
              >
                Admin Panel
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <>
                <button
                  onClick={() => setView("dashboard")}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-colors"
                >
                  <UserIcon className="w-4 h-4" /> Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-yellow-500 text-black font-black rounded-xl hover:bg-yellow-400 transition-all active:scale-95"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-yellow-500 text-black font-black rounded-xl hover:bg-yellow-400 transition-all active:scale-95 shadow-lg shadow-yellow-500/25"
              >
                Get Started
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-black border-b border-white/10 p-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
            <a href="#marketplace" onClick={() => setIsMenuOpen(false)} className="text-xl font-bold hover:text-yellow-500 transition-colors">Marketplace</a>
            <a href="#plans" onClick={() => setIsMenuOpen(false)} className="text-xl font-bold hover:text-yellow-500 transition-colors">Pricing</a>
            {isAdmin && (
              <button onClick={() => { setView("admin"); setIsMenuOpen(false); }} className="text-xl font-bold text-left text-red-500 hover:text-red-400 transition-colors">Admin Panel</button>
            )}
            <hr className="border-white/10" />
            {currentUser ? (
              <>
                <button onClick={() => { setView("dashboard"); setIsMenuOpen(false); }} className="w-full bg-white/5 text-white font-black py-4 rounded-xl hover:bg-white/10 transition-colors">Dashboard</button>
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full bg-yellow-500 text-black font-black py-4 rounded-xl hover:bg-yellow-400 transition-colors">Logout</button>
              </>
            ) : (
              <button onClick={() => { setShowAuthModal(true); setIsMenuOpen(false); }} className="w-full bg-yellow-500 text-black font-black py-4 rounded-xl hover:bg-yellow-400 transition-colors">Get Started</button>
            )}
          </div>
        )}
      </nav>

      <main>
        <Hero />
        
        <div className="py-12 border-y border-white/5 overflow-hidden whitespace-nowrap bg-black/50 backdrop-blur-sm">
          <div className="flex animate-[scroll_40s_linear_infinite] gap-12 text-2xl font-black text-white/10 uppercase italic select-none">
            <span>Used by 500+ Producers</span><span className="text-yellow-500/20">•</span>
            <span>10,000+ Downloads</span><span className="text-yellow-500/20">•</span>
            <span>Industry Standard Stems</span><span className="text-yellow-500/20">•</span>
            <span>Exclusive Rights Available</span><span className="text-yellow-500/20">•</span>
            <span>New Beats Every Friday</span><span className="text-yellow-500/20">•</span>
            <span>Used by 500+ Producers</span><span className="text-yellow-500/20">•</span>
            <span>10,000+ Downloads</span>
          </div>
        </div>

        <section id="plans">
          <div className="max-w-7xl mx-auto px-4 py-24">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight italic">Choose Your Tier</h2>
              <p className="text-gray-400 max-w-2xl mx-auto font-medium">Flexible plans for every stage of your music career.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PRICING_TIERS.map((tier) => (
                <div key={tier.name} className={`relative flex flex-col p-10 rounded-[3rem] transition-all duration-500 group hover:scale-[1.02] ${
                  tier.primary ? "bg-gradient-to-b from-yellow-500/20 to-black border-2 border-yellow-500 shadow-2xl shadow-yellow-500/20" : "bg-white/5 border border-white/10 hover:border-white/20"
                }`}>
                  {tier.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-bounce">
                      {tier.badge}
                    </div>
                  )}
                  <h3 className="text-3xl font-black italic mb-2 tracking-tighter">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-black">${tier.price}</span>
                    <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">/mo</span>
                  </div>
                  <ul className="flex-1 space-y-4 mb-10">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="text-gray-400 text-sm flex gap-3 group-hover:text-white transition-colors">
                        <div className="w-5 h-5 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-500">
                          <Check className="w-3 h-3" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleStartPlan(tier.name)}
                    className={`w-full py-5 rounded-2xl font-black transition-all active:scale-95 shadow-xl ${
                      tier.name === 'Basic' 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-blue-500/30' 
                        : tier.primary
                        ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    {tier.name === 'Basic' ? (currentUser ? 'Get Free Plan' : 'Start Free') : `Select ${tier.name}`}
                  </button>
                  <p className="mt-4 text-center text-[10px] font-black uppercase text-gray-500 tracking-widest">
                    No hidden fees • Cancel Anytime
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div id="marketplace">
          <BeatMarket />
        </div>
        <SocialProof />
        <LeadMagnet />
      </main>

      <footer className="bg-black py-20 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Disc className="w-10 h-10 text-yellow-500" />
            <div className="text-left leading-tight">
              <p className="font-black italic text-xl uppercase tracking-tighter">Heyyo Stardom</p>
              <p className="text-[10px] font-bold text-gray-600 tracking-widest">Professional Audio Ecosystem</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-black uppercase tracking-widest text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Affiliates</a>
            <a href="#" className="hover:text-white transition-colors">Legal</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
          </div>
          <div className="text-gray-600 text-[10px] font-black uppercase tracking-widest text-center md:text-right">
            © {new Date().getFullYear()} Heyyo Stardom. <br />Made for producers, by producers.
          </div>
        </div>
      </footer>

      <ChatWidget />

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;