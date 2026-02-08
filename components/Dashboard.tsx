import React, { useEffect, useState, useCallback, useMemo } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Beat, PlanTier } from "../types";
import {
  ArrowUpRight,
  CheckCircle,
  Crown,
  Download,
  HelpCircle,
  Heart,
  Music,
  Play,
  Sparkles,
  Users,
  X,
  Zap,
  LogOut,
} from "lucide-react";
import { fetchBeats } from "../services/beatService";
import { downloadService } from '../services/downloadService';
import { supabase } from "../supabase";

interface DashboardProps {
  user: SupabaseUser;
  onLogout: () => void;
  onUpgradePlan?: () => void;
  
}

interface UserProfile {
  id: string;
  email: string;
  plan_tier: PlanTier;
  subscription_status: 'active' | 'pending' | 'disabled' | 'failed';
  download_count_this_month: number;
  joined_at: string;
  referral_code?: string;
  referral_earnings?: number;
}

interface DownloadStats {
  plan: PlanTier;
  usedThisMonth: number;
  maxDownloads: number;
  remaining: number;
  resetDate: string;
}

// Extracted Components
const StatsCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  description?: string;
}> = ({ title, value, icon, color, description }) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-500',
    green: 'bg-green-500/20 text-green-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
    purple: 'bg-purple-500/20 text-purple-500'
  };

  return (
    <div className="glass rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white">{title}</h3>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black text-white mb-2">{value}</p>
      {description && <p className="text-sm text-gray-400">{description}</p>}
    </div>
  );
};

const WishlistItem: React.FC<{
  beat: Beat;
  isInWishlist: boolean;
  onToggleWishlist: (beatId: string) => void;
  onPlay: (beat: Beat) => void;
}> = ({ beat, isInWishlist, onToggleWishlist, onPlay }) => (
  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex-shrink-0">
      {beat.coverUrl && (
        <img
          src={`https://xfnirkotcpclpbniudmp.supabase.co/storage/v1/object/public/beats/${beat.coverUrl}`}
          alt={beat.title}
          className="w-full h-full object-cover"
          loading="eager"
        />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-bold text-sm text-white truncate">{beat.title}</div>
      <div className="text-xs text-gray-400 truncate">{beat.producer}</div>
    </div>
    <div className="flex items-center gap-2">
      <button 
        onClick={() => onToggleWishlist(beat.id)}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        title="Remove from wishlist"
      >
        <Heart className="w-4 h-4 text-red-500" fill="currentColor" />
      </button>
      <button 
        onClick={() => onPlay(beat)}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors" 
        title="Play"
      >
        <Play className="w-4 h-4 text-white" />
      </button>
    </div>
  </div>
);

const PlanBenefits: React.FC<{ plan: PlanTier }> = ({ plan }) => {
  const benefits = useMemo(() => {
    switch (plan) {
      case 'Basic':
        return [
          { text: '30 MP3 Downloads/Month', included: true },
          { text: 'Unlimited Previews', included: true },
          { text: 'WAV & Stems Access', included: false },
          { text: 'Commercial Rights', included: false }
        ];
      case 'Pro':
        return [
          { text: 'Unlimited MP3 + WAV Downloads', included: true },
          { text: 'Basic Commercial Rights', included: true },
          { text: 'Stems Access', included: false }
        ];
      case 'Exclusive':
        return [
          { text: 'All Formats + Stems', included: true },
          { text: 'Full Commercial Rights', included: true },
          { text: 'Exclusive Beats Access', included: true }
        ];
      default:
        return [];
    }
  }, [plan]);

  return (
    <ul className="space-y-3">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center gap-2 text-sm">
          {benefit.included ? (
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
          <span className={benefit.included ? 'text-white' : 'text-gray-500'}>
            {benefit.text}
          </span>
        </li>
      ))}
    </ul>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onUpgradePlan }) => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(null);

  // New function to handle audio preview playback
  const handlePlayPreview = async (beat: any) => {
    // Check both potential property names (camelCase from frontend type or snake_case from DB)
    const path = beat.preview_path || beat.previewPath;
    
    if (!path) {
      console.warn('No preview path found for beat:', beat.title);
      return;
    }
    
    try {
      // Get public URL from Supabase Storage
      const { data } = supabase.storage
        .from('beat-previews')
        .getPublicUrl(path);
      
      if (data?.publicUrl) {
        const audio = new Audio(data.publicUrl);
        await audio.play();
      } else {
        console.error('No preview URL found for beat');
      }
    } catch (error) {
      console.log('Play failed:', error);
    }
  };

  const loadUserProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        
        // Create profile if doesn't exist
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            plan_tier: 'Basic',
            subscription_status: 'active',
            download_count_this_month: 0,
            joined_at: new Date().toISOString()
          });
        
        if (createError) {
          console.error('Failed to create profile:', createError);
          setUserProfile({
            id: user.id,
            email: user.email || '',
            plan_tier: 'Basic',
            subscription_status: 'active',
            download_count_this_month: 0,
            joined_at: new Date().toISOString()
          });
          return;
        }
        
        // Reload after creation
        const { data: newData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setUserProfile(newData);
        return;
      }

      if (!data) {
        // Profile doesn't exist, create it
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            plan_tier: 'Basic',
            subscription_status: 'active',
            download_count_this_month: 0,
            joined_at: new Date().toISOString()
          });
        
        if (!createError) {
          setUserProfile({
            id: user.id,
            email: user.email || '',
            plan_tier: 'Basic',
            subscription_status: 'active',
            download_count_this_month: 0,
            joined_at: new Date().toISOString()
          });
        }
        return;
      }

      // Normalize profile fields to ensure UI uses `joined_at`
      const normalized = {
        ...data,
        joined_at: (data as any)?.joined_at || (data as any)?.created_at || new Date().toISOString()
      };
      setUserProfile(normalized as any);
    } catch (error) {
      console.error('Exception loading user profile:', error);
      // Set fallback profile
      setUserProfile({
        id: user.id,
        email: user.email || '',
        plan_tier: 'Basic',
        subscription_status: 'active',
        download_count_this_month: 0,
        joined_at: new Date().toISOString()
      });
    }
  }, [user]);

  const loadDownloadStats = useCallback(async () => {
    if (!user.id || !userProfile) return;

    try {
      const stats = await downloadService.getUserDownloadStats(user.id);
      setDownloadStats(stats);
    } catch (error) {
      console.error('Failed to load download stats:', error);
      setDownloadStats({
        plan: userProfile.plan_tier,
        usedThisMonth: 0,
        maxDownloads: userProfile.plan_tier === 'Basic' ? 30 : Infinity,
        remaining: userProfile.plan_tier === 'Basic' ? 30 : Infinity,
        resetDate: getNextMonthFirst()
      });
    }
  }, [user.id, userProfile]);

  const loadBeats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBeats();
      setBeats(data);
    } catch (error) {
      console.error('Error loading beats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWishlist = useCallback(async () => {
    if (!user.id) return;

    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select("beat_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setWishlist(data.map((item) => item.beat_id));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  }, [user.id]);

  const toggleWishlist = useCallback(async (beatId: string) => {
    if (!user.id) return;

    const isInWishlist = wishlist.includes(beatId);

    try {
      if (isInWishlist) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('beat_id', beatId);
        
        setWishlist(wishlist.filter(id => id !== beatId));
      } else {
        await supabase
          .from('wishlists')
          .insert([{ user_id: user.id, beat_id: beatId }]);
        
        setWishlist([...wishlist, beatId]);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  }, [user.id, wishlist]);

  const getNextMonthFirst = useCallback((): string => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    loadBeats();
    loadWishlist();
  }, [loadBeats, loadWishlist]);

  useEffect(() => {
    loadDownloadStats();
  }, [loadDownloadStats]);

  const wishlistBeats = useMemo(() => 
    beats.filter(beat => wishlist.includes(beat.id)).slice(0, 4),
    [beats, wishlist]
  );

  const recommendedBeats = useMemo(() => 
    beats.slice(0, 3),
    [beats]
  );

  const planIcon = useMemo(() => {
    if (!userProfile) return <Zap className="w-8 h-8 text-white" />;
    
    switch (userProfile.plan_tier) {
      case "Exclusive": return <Crown className="w-8 h-8 text-white" />;
      case "Pro": return <Sparkles className="w-8 h-8 text-white" />;
      default: return <Zap className="w-8 h-8 text-white" />;
    }
  }, [userProfile]);

  const planGradient = useMemo(() => {
    if (!userProfile) return "from-blue-500 to-cyan-500";
    
    switch (userProfile.plan_tier) {
      case "Exclusive": return "from-purple-600 to-pink-600";
      case "Pro": return "from-yellow-500 to-orange-500";
      default: return "from-blue-500 to-cyan-500";
    }
  }, [userProfile]);

  if (!userProfile || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxDownloads = downloadStats?.maxDownloads ?? (userProfile.plan_tier === "Basic" ? 30 : Infinity);
  const remainingDownloads = maxDownloads === Infinity
    ? Infinity
    : (downloadStats?.remaining ?? Math.max(0, 30 - (userProfile.download_count_this_month || 0)));

  const remainingLabel = remainingDownloads === Infinity ? "∞" : String(remainingDownloads);
  const quotaPercent = maxDownloads === Infinity
    ? 100
    : Math.max(0, Math.min(100, (Number(remainingDownloads) / Number(maxDownloads)) * 100));

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900/50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-purple-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl bg-gradient-to-r ${planGradient}`}>
                  {planIcon}
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-black italic text-white">
                    Welcome back, {userProfile.email.split("@")[0]}
                  </h1>
                  <p className="text-gray-400">Ready to find your next hit?</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                <div className="bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <div className="text-sm text-gray-400">Member since</div>
                  <div className="font-bold text-white">
                    {new Date(userProfile.joined_at).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <div className="text-sm text-gray-400">Account Status</div>
                  <div className={`font-bold ${
                    userProfile.subscription_status === "disabled" ? "text-red-500" : "text-green-500"
                  }`}>
                    {userProfile.subscription_status === "disabled" ? "Disabled" : "Active"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-colors text-white border border-white/10"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatsCard
              title="Current Plan"
              value={userProfile.plan_tier}
              icon={planIcon}
              color={userProfile.plan_tier === "Exclusive" ? "purple" : userProfile.plan_tier === "Pro" ? "yellow" : "blue"}
              description={userProfile.plan_tier === "Basic" ? "Upgrade Plan →" : undefined}
            />

            <StatsCard
              title="Downloads"
              value={remainingLabel}
              icon={<Download className="w-5 h-5" />}
              color="green"
              description={maxDownloads === Infinity ? "Unlimited" : `${maxDownloads - remainingDownloads} of ${maxDownloads} used`}
            />

            <StatsCard
              title="Total Beats"
              value={beats.length}
              icon={<Music className="w-5 h-5" />}
              color="purple"
              description="Available to browse"
            />

            <StatsCard
              title="Wishlist"
              value={wishlist.length}
              icon={<Heart className="w-5 h-5" />}
              color="yellow"
              description="Saved beats"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Wishlist Beats */}
              {wishlistBeats.length > 0 && (
                <div className="glass rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="font-bold text-xl mb-6 text-white">Your Wishlist</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wishlistBeats.map((beat) => (
                      <WishlistItem
                        key={beat.id}
                        beat={beat}
                        isInWishlist={true}
                        onToggleWishlist={toggleWishlist}
                        onPlay={handlePlayPreview}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="font-bold mb-4 text-white">Plan Benefits</h3>
                  <PlanBenefits plan={userProfile.plan_tier} />
                </div>

                <div className="glass rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="font-bold mb-4 text-white">Quick Actions</h3>
                  <div className="space-y-3">
                    <a 
                      href="#marketplace"
                      className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white"
                    >
                      <span>Browse Beats</span>
                      <Music className="w-4 h-4" />
                    </a>
                    <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white">
                      <span>View Wishlist ({wishlist.length})</span>
                      <Heart className="w-4 h-4" />
                    </button>
                    <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white">
                      <span>Refer Friends</span>
                      <Users className="w-4 h-4" />
                    </button>
                    {userProfile.plan_tier === "Basic" && (
                      <button
                        onClick={() => {
                          if (onUpgradePlan) {
                            onUpgradePlan();
                          } else {
                            window.location.href = "/#plans";
                          }
                        }}
                        aria-label="Upgrade Plan - open pricing"
                        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-500 rounded-xl hover:from-yellow-500/30 hover:to-orange-500/30 transition-colors"
                      >
                        <span>Upgrade Plan</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Profile Card */}
              <div className="glass rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl font-black text-white">
                    {userProfile.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Your Profile</h3>
                    <p className="text-sm text-gray-400">{userProfile.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Account Tier</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      userProfile.plan_tier === "Exclusive" ? "bg-purple-500/20 text-purple-500" :
                      userProfile.plan_tier === "Pro" ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-blue-500/20 text-blue-500"
                    }`}>
                      {userProfile.plan_tier}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Member Since</span>
                    <span className="font-bold text-white">
                      {new Date(userProfile.joined_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Downloads (this month)</span>
                    <span className="font-bold text-white">{userProfile.download_count_this_month}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="glass rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="font-bold mb-6 text-white">Recommended For You</h3>
                <div className="space-y-4">
                  {recommendedBeats.map((beat) => (
                    <div key={beat.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex-shrink-0">
                        {beat.coverUrl && (
                          <img
                            src={`https://xfnirkotcpclpbniudmp.supabase.co/storage/v1/object/public/beats/${beat.coverUrl}`}
                            alt={beat.title}
                            className="w-full h-full object-cover"
                            loading="eager"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white truncate">{beat.title}</div>
                        <div className="text-xs text-gray-400 truncate">{beat.producer}</div>
                      </div>
                      <button 
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors" 
                        title="Play"
                        onClick={(e) => { e.stopPropagation(); handlePlayPreview(beat); }}
                      >
                        <Play className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support Card */}
              <div className="glass rounded-2xl p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <HelpCircle className="w-6 h-6 text-blue-500" />
                  <h3 className="font-bold text-white">Need Help?</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Contact our support team for any questions about your account or downloads.
                </p>
                <button className="w-full py-2 text-sm text-center text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-xl transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;