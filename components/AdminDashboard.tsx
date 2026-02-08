import React, { useState, useEffect } from "react";
import { 
  X, Upload, BarChart3, Users, DollarSign, Shield, LogOut, 
  Download, Eye, Edit, Trash2, AlertCircle, Search, MoreVertical 
} from "lucide-react";
import AdminBeatUpload from "./AdminBeatUpload";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { supabase } from "../supabase";
import { fetchBeats } from "../services/beatService";
import { signOut } from "../services/authService";
import { PlanTier } from "../types";

interface AdminDashboardProps {
  onLogout: () => void;
}

interface Beat {
  id: string;
  title: string;
  genre: string;
  download_count: { mp3: number; wav: number; stems: number };
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  plan_tier: PlanTier;
  subscription_status: string;
  created_at: string;
  download_count_this_month: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<"upload" | "analytics" | "beats" | "users" | "system">("analytics");
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userStats, setUserStats] = useState<any | null>(null);
  
  const [stats, setStats] = useState({
    totalBeats: 0,
    totalDownloads: 0,
    totalUsers: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    checkAdminSession();
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const checkAdminSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();

      setIsSuperAdmin(adminData?.is_super_admin || false);
    } catch (error) {
      console.error('Error checking admin session:', error);
      setIsSuperAdmin(false);
    }
  };

  const loadInitialData = async () => {
    if (activeTab === "beats" || activeTab === "analytics") {
      await Promise.all([loadBeats(), loadStats()]);
    }
  };

  const loadBeats = async () => {
    setLoading(true);
    try {
      const data = await fetchBeats();
      setBeats(data as unknown as Beat[]);
    } catch (error) {
      console.error("Error loading beats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { count: beatsCount } = await supabase
        .from("beats")
        .select("*", { count: "exact", head: true });

      const { count: downloadsCount } = await supabase
        .from("downloads")
        .select("*", { count: "exact", head: true });

      // Use RPC for richer user stats if available, fallback handled in fetchUserStats
      await fetchUserStats();

      // Use the profiles table to compute active users (avoid calling admin REST from client)
      const { data: profilesForActive, error: profilesError } = await supabase
        .from('profiles')
        .select('subscription_status, last_sign_in_at');

      if (profilesError) {
        if (import.meta.env.DEV) console.error('Error fetching profiles for active user count:', profilesError);
      }

      const activeUsers = (profilesForActive?.filter(p => p.subscription_status === 'active' || !!p.last_sign_in_at).length) || 0;

      setStats({
        totalBeats: beatsCount || 0,
        totalDownloads: downloadsCount || 0,
        totalUsers: activeUsers || 0,
        totalRevenue: (beatsCount || 0) * 39.99 * 0.7
      });
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error loading stats:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Query the profiles table directly
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (import.meta.env.DEV) console.error('Error fetching profiles:', error);
        return;
      }

      setUsers(profiles || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Exception fetching users:', err);
    }
  };

  const loadUsers = async () => {
    // Keep compatibility: call fetchUsers
    await fetchUsers();
  };

  const handleUpgradeUser = async (userId: string, newPlan: PlanTier) => {
    if (!confirm(`Upgrade user to ${newPlan} plan?`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          plan_tier: newPlan,
          subscription_status: 'active'
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      alert('User upgraded successfully');
      loadUsers();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Upgrade error:', error);
      alert('Failed to upgrade user');
    }
  };

  const handleDisableUser = async (userId: string) => {
    if (!confirm('Disable this user account?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: 'disabled' })
        .eq('id', userId);
      
      if (error) throw error;
      
      alert('User disabled');
      loadUsers();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Disable error:', error);
      alert('Failed to disable user');
    }
  };

  const deleteBeat = async (beatId: string) => {
    if (!confirm("Are you sure you want to delete this beat?")) return;

    try {
      const { error } = await supabase
        .from("beats")
        .delete()
        .eq("id", beatId);

      if (error) throw error;
      
      alert("Beat deleted successfully");
      loadBeats();
    } catch (error) {
      console.error("Error deleting beat:", error);
      alert("Failed to delete beat");
    }
  };

  const handleAdminLogout = async () => {
    await signOut();
    onLogout();
  };

  const resetAllDownloads = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ download_count_this_month: 0 })
        .neq('id', '');

      if (error) throw error;
      alert('All download counts have been reset');
      loadUsers();
    } catch (error) {
      console.error('Error resetting downloads:', error);
      alert('Failed to reset download counts');
    }
  };

  const clearAnalytics = async () => {
    try {
      const { error } = await supabase
        .from('downloads')
        .delete()
        .neq('id', '');

      if (error) throw error;
      alert('Analytics data has been cleared');
      loadStats();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error clearing analytics:', error);
      alert('Failed to clear analytics');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const fetchUserStats = async () => {
    try {
      // NOTE: If this RPC errors with "column p.joined_at does not exist",
      // the server-side function should be updated to use p.created_at
      // or the profiles table should be given a joined_at column. See DB/RPC migration.
      const { data, error } = await supabase.rpc('get_user_stats', {
        days_ago: 30
      });
      
      if (error) {
        // If the RPC references a non-existent column (e.g., p.joined_at), inform and fallback
        if (error.code === '42703' || (error.details && (error.details as string).includes('joined_at'))) {
          if (import.meta.env.DEV) console.warn("get_user_stats RPC likely references a missing column (p.joined_at). Consider updating the function to use p.created_at or adding joined_at to profiles.", error);
        } else if (import.meta.env.DEV) {
          console.error('Error fetching user stats:', error);
        }

        // Fallback to profiles table only
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, created_at, plan_tier');
        
        const stats = {
          total_users: profiles?.length || 0,
          active_users: profiles?.length || 0,
          new_users_today: profiles?.filter((p: any) => 
            new Date(p.created_at).toDateString() === new Date().toDateString()
          ).length || 0
        };
        
        setUserStats(stats);
        return;
      }
      
      setUserStats(data?.[0] ?? null);
    } catch (error) {
      console.error('Exception fetching user stats:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "system":
        return (
          <div className="p-6">
            <h3 className="text-2xl font-bold mb-6">System Administration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => confirm('Reset all download counts?') && resetAllDownloads()}
                className="p-6 glass rounded-2xl text-left hover:scale-[1.02] transition-transform border border-red-500/20"
              >
                <div className="text-red-500 font-bold mb-2">Reset All Downloads</div>
                <p className="text-sm text-gray-400">Set all user download counts to zero</p>
              </button>
              
              <button
                onClick={() => confirm('Clear all analytics data?') && clearAnalytics()}
                className="p-6 glass rounded-2xl text-left hover:scale-[1.02] transition-transform border border-red-500/20"
              >
                <div className="text-red-500 font-bold mb-2">Clear Analytics</div>
                <p className="text-sm text-gray-400">Delete all analytics and revenue data</p>
              </button>
            </div>
          </div>
        );
      case "upload":
        return <AdminBeatUpload onUploadSuccess={loadBeats} />;
      case "beats":
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Beat Management</h3>
              <button
                onClick={() => setActiveTab("upload")}
                className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload New Beat
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : beats.length === 0 ? (
              <div className="text-center py-12 glass rounded-2xl">
                <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 font-bold">No beats uploaded yet</p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="mt-4 px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400"
                >
                  Upload Your First Beat
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full glass rounded-2xl overflow-hidden">
                  <thead>
                    <tr className="bg-white/5 text-left text-sm font-bold">
                      <th className="p-4">Title</th>
                      <th className="p-4">Genre</th>
                      <th className="p-4">Downloads</th>
                      <th className="p-4">Uploaded</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {beats.map((beat) => (
                      <tr key={beat.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium">{beat.title}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold">
                            {beat.genre}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <span className="text-xs">
                              MP3: <strong className="text-green-500">{beat.download_count?.mp3 || 0}</strong>
                            </span>
                            <span className="text-xs">
                              WAV: <strong className="text-blue-500">{beat.download_count?.wav || 0}</strong>
                            </span>
                            <span className="text-xs">
                              Stems: <strong className="text-purple-500">{beat.download_count?.stems || 0}</strong>
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {formatDate(beat.created_at)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBeat(beat.id)}
                              className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case "analytics":
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Platform Analytics</h3>
              <div className="text-sm text-gray-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <AnalyticsDashboard timeframe="month" />
          </div>
        );
      case "users":
        return (
          <div className="p-6">
            <h3 className="text-2xl font-bold mb-6">User Management</h3>
            
            <div className="glass rounded-2xl overflow-hidden mb-6">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                    <select className="bg-[#0b0b0b] text-white border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500">
                      <option className="bg-[#0b0b0b] text-white">All Plans</option>
                      <option className="bg-[#0b0b0b] text-white">Basic</option>
                      <option className="bg-[#0b0b0b] text-white">Pro</option>
                      <option className="bg-[#0b0b0b] text-white">Exclusive</option>
                    </select>
                  </div>
                  <div className="text-sm text-gray-400">
                    Total: {users.length} users
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5 text-left text-sm font-bold">
                      <th className="p-4">User</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Joined</th>
                      <th className="p-4">Downloads</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{user.email}</div>
                              <div className="text-xs text-gray-400">ID: {user.id.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            user.plan_tier === 'Exclusive' ? 'bg-purple-500/20 text-purple-500' :
                            user.plan_tier === 'Pro' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {user.plan_tier}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            user.subscription_status === 'active' ? 'bg-green-500/20 text-green-500' :
                            user.subscription_status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-red-500/20 text-red-500'
                          }`}>
                            {user.subscription_status || 'pending'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {user.download_count_this_month || 0}/{
                              user.plan_tier === 'Basic' ? '30' : '∞'
                            }
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpgradeUser(user.id, 'Pro')}
                              className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-lg text-xs font-bold hover:bg-yellow-500/30"
                            >
                              Upgrade
                            </button>
                            <button
                              onClick={() => handleDisableUser(user.id)}
                              className="px-3 py-1 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/30"
                            >
                              Disable
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[2000] overflow-y-auto">
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8 relative">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-3xl font-black">Administrator Panel</h1>
                <p className="text-gray-500">Curry Stardom Management Console</p>
              </div>
              {isSuperAdmin && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
                  🔥 SUPER ADMIN
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-400 font-medium">
              You are accessing sensitive administrative functions. All actions are logged.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            <button onClick={() => setActiveTab("upload")} className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "upload" ? "bg-yellow-500 text-black" : "bg-white/5 hover:bg-white/10"}`}>
              <Upload className="w-5 h-5" /> Upload Beats
            </button>
            <button onClick={() => setActiveTab("beats")} className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "beats" ? "bg-yellow-500 text-black" : "bg-white/5 hover:bg-white/10"}`}>
              <BarChart3 className="w-5 h-5" /> Manage Beats
            </button>
            <button onClick={() => setActiveTab("analytics")} className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "analytics" ? "bg-yellow-500 text-black" : "bg-white/5 hover:bg-white/10"}`}>
              <DollarSign className="w-5 h-5" /> Analytics
            </button>
            <button onClick={() => setActiveTab("users")} className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "users" ? "bg-yellow-500 text-black" : "bg-white/5 hover:bg-white/10"}`}>
              <Users className="w-5 h-5" /> Users
            </button>
            {isSuperAdmin && (
              <button onClick={() => setActiveTab("system")} className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "system" ? "bg-gradient-to-r from-red-600 to-pink-600 text-white" : "bg-white/5 hover:bg-white/10"}`}>
                <Shield className="w-5 h-5" /> System
              </button>
            )}
          </div>

          <div className="glass rounded-3xl overflow-hidden">
            {renderContent()}
          </div>

          <div className="mt-8 text-center text-xs text-gray-600">
            <p>Admin Session Active • All actions are monitored</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;