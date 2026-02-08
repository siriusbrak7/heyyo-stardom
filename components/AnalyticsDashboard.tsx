import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DollarSign, Download, Users, Music, TrendingUp, TrendingDown, 
  BarChart3, PieChart, Calendar, Filter, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Eye, Clock, Target, Zap,
  BarChart4, LineChart, Activity, Database, FileText,
  MoreVertical, ChevronDown, ExternalLink, Maximize2
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { RevenueStats, DownloadStats, UserStats, BeatStats } from '../services/analyticsService';
import { PlanTier } from '../types';

interface AnalyticsDashboardProps {
  timeframe?: 'day' | 'week' | 'month' | 'year';
}

interface TimeSeriesData {
  date: string;
  value: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ timeframe = 'month' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'beats'>('overview');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>(timeframe);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [beatStats, setBeatStats] = useState<BeatStats | null>(null);
  
  const [revenueData, setRevenueData] = useState<TimeSeriesData[]>([]);
  const [downloadData, setDownloadData] = useState<TimeSeriesData[]>([]);
  const [userData, setUserData] = useState<TimeSeriesData[]>([]);
  
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'detailed'>('cards');

  // Load all analytics data
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    setLoading(true);
    setError(null);

    try {
      const [revenue, downloads, users, beats, revData, dlData, usrData] = await Promise.all([
        analyticsService.getRevenueStats(timeRange),
        analyticsService.getDownloadStats(timeRange),
        analyticsService.getUserStats(),
        analyticsService.getBeatStats(),
        analyticsService.getTimeSeriesData('revenue', 30),
        analyticsService.getTimeSeriesData('downloads', 30),
        analyticsService.getTimeSeriesData('users', 30)
      ]);

      setRevenueStats(revenue);
      setDownloadStats(downloads);
      setUserStats(users);
      setBeatStats(beats);
      setRevenueData(revData);
      setDownloadData(dlData);
      setUserData(usrData);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auto-refresh every 30 seconds when on overview tab
  useEffect(() => {
    if (activeTab !== 'overview') return;
    
    const interval = setInterval(() => {
      loadAllData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, loadAllData]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  // Format number with commas
  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  // Calculate percentage change
  const calculateChange = useCallback((current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, []);

  // Export data as CSV
  const exportData = useCallback(async () => {
    setExporting(true);
    try {
      const data = {
        timestamp: new Date().toISOString(),
        timeframe: timeRange,
        revenue: revenueStats,
        downloads: downloadStats,
        users: userStats,
        beats: beatStats
      };

      const csvContent = `data:text/csv;charset=utf-8,${Object.entries(data)
        .map(([key, value]) => `${key},${JSON.stringify(value)}`)
        .join('\n')}`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `analytics-${timeRange}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  }, [timeRange, revenueStats, downloadStats, userStats, beatStats]);

  // Stat card component
  const StatCard = useCallback(({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    changeLabel,
    color = 'blue',
    loading: cardLoading = false
  }: {
    title: string;
    value: string | number;
    icon: any;
    change?: number;
    changeLabel?: string;
    color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
    loading?: boolean;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500/10 text-blue-500',
      green: 'bg-green-500/10 text-green-500',
      purple: 'bg-purple-500/10 text-purple-500',
      yellow: 'bg-yellow-500/10 text-yellow-500',
      red: 'bg-red-500/10 text-red-500'
    };

    const changeColor = change && change >= 0 ? 'text-green-500' : 'text-red-500';
    const changeIcon = change && change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />;

    return (
      <div className="glass rounded-2xl p-6 hover:scale-[1.02] transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${changeColor} ${changeColor.includes('green') ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              {changeIcon}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        
        {cardLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded mb-2" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{title}</p>
            {changeLabel && (
              <p className="text-xs text-gray-400 mt-2">{changeLabel}</p>
            )}
          </>
        )}
      </div>
    );
  }, []);

  // Chart component
  const Chart = useCallback(({
    title,
    data,
    color = 'blue',
    height = 200
  }: {
    title: string;
    data: TimeSeriesData[];
    color?: 'blue' | 'green' | 'purple' | 'yellow';
    height?: number;
  }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const colorClasses = {
      blue: 'from-blue-500 to-cyan-500',
      green: 'from-green-500 to-emerald-500',
      purple: 'from-purple-500 to-pink-500',
      yellow: 'from-yellow-500 to-orange-500'
    };

    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">{title}</h3>
          <span className="text-sm text-gray-500">
            {data.length} days
          </span>
        </div>
        <div className="h-48 flex items-end gap-1">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center group"
            >
              <div
                className={`w-full bg-gradient-to-t ${colorClasses[color]} rounded-t-lg transition-all duration-300 group-hover:opacity-80 cursor-pointer`}
                style={{ 
                  height: `${(item.value / maxValue) * 80}%`,
                  minHeight: '4px'
                }}
                title={`${item.date}: ${item.value}`}
              />
              <div className="text-xs text-gray-500 mt-2">
                {new Date(item.date).getDate()}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Min: {Math.min(...data.map(d => d.value))}</span>
          <span>Avg: {Math.round(data.reduce((a, b) => a + b.value, 0) / data.length)}</span>
          <span>Max: {maxValue}</span>
        </div>
      </div>
    );
  }, []);

  // Loading state
  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Database className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Failed to Load Analytics</h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => loadAllData(true)}
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Analytics Dashboard</h1>
          <p className="text-gray-500">Real-time insights and performance metrics</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-[#0b0b0b] text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500"
            >
              <option className="bg-[#0b0b0b] text-white" value="day">Today</option>
              <option className="bg-[#0b0b0b] text-white" value="week">This Week</option>
              <option className="bg-[#0b0b0b] text-white" value="month">This Month</option>
              <option className="bg-[#0b0b0b] text-white" value="year">This Year</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="bg-[#0b0b0b] text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500"
            >
              <option className="bg-[#0b0b0b] text-white" value="cards">Cards View</option>
              <option className="bg-[#0b0b0b] text-white" value="detailed">Detailed View</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={exportData}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>

            <button className="p-1.5 hover:bg-white/10 rounded-lg">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {refreshing && (
          <span className="flex items-center gap-2 text-yellow-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Updating...
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-yellow-500 text-black'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'revenue'
              ? 'bg-yellow-500 text-black'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Revenue
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-yellow-500 text-black'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
        <button
          onClick={() => setActiveTab('beats')}
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'beats'
              ? 'bg-yellow-500 text-black'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <Music className="w-4 h-4" />
          Beats
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Monthly Revenue (MRR)"
              value={formatCurrency(revenueStats?.mrr || 0)}
              icon={DollarSign}
              change={revenueStats?.growthRate}
              color="green"
              loading={loading}
            />
            
            <StatCard
              title="Active Users"
              value={formatNumber(userStats?.activeUsers || 0)}
              icon={Users}
              change={userStats?.userGrowthRate}
              color="blue"
              loading={loading}
            />
            
            <StatCard
              title="Downloads This Month"
              value={formatNumber(downloadStats?.downloadsThisMonth || 0)}
              icon={Download}
              change={downloadStats?.growthRate}
              color="purple"
              loading={loading}
            />
            
            <StatCard
              title="Total Beats"
              value={formatNumber(beatStats?.totalBeats || 0)}
              icon={Music}
              change={beatStats?.beatsThisMonth ? calculateChange(beatStats.beatsThisMonth, 0) : 0}
              color="yellow"
              loading={loading}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Churn Rate"
              value={`${revenueStats?.churnRate || 0}%`}
              icon={TrendingDown}
              color="red"
              loading={loading}
            />
            
            <StatCard
              title="LTV"
              value={formatCurrency(revenueStats?.ltv || 0)}
              icon={Target}
              color="green"
              loading={loading}
            />
            
            <StatCard
              title="User Retention"
              value={`${userStats?.userRetention || 0}%`}
              icon={Eye}
              color="blue"
              loading={loading}
            />
            
            <StatCard
              title="Avg Session"
              value={`${userStats?.avgSessionDuration || 0}m`}
              icon={Clock}
              color="purple"
              loading={loading}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Chart
              title="Revenue Trend (30 days)"
              data={revenueData}
              color="green"
            />
            
            <Chart
              title="Download Activity (30 days)"
              data={downloadData}
              color="purple"
            />
          </div>

          {/* Plan Distribution */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Plan Distribution</h3>
              <button className="text-sm text-gray-500 hover:text-white flex items-center gap-1">
                View Details
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {userStats?.planDistribution && Object.entries(userStats.planDistribution).map(([plan, count]) => {
                const total = userStats.totalUsers;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                return (
                  <div key={plan} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          plan === 'Basic' ? 'bg-blue-500/20 text-blue-500' :
                          plan === 'Pro' ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-purple-500/20 text-purple-500'
                        }`}>
                          {plan === 'Basic' ? <Users className="w-4 h-4" /> :
                           plan === 'Pro' ? <Zap className="w-4 h-4" /> :
                           <Target className="w-4 h-4" />}
                        </div>
                        <span className="font-bold">{plan}</span>
                      </div>
                      <span className="text-gray-400">{formatNumber(count)} users</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            plan === 'Basic' ? 'bg-blue-500' :
                            plan === 'Pro' ? 'bg-yellow-500' :
                            'bg-purple-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{percentage.toFixed(1)}% of total</span>
                        <span>${plan === 'Basic' ? '0' : plan === 'Pro' ? '39.99' : '99.99'}/mo</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Performing Beats */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Top Performing Beats</h3>
              <div className="space-y-3">
                {downloadStats?.topBeats.slice(0, 5).map((beat, index) => (
                  <div key={beat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-xs font-bold">
                        #{index + 1}
                      </div>
                      <div className="max-w-[180px]">
                        <div className="font-medium truncate">{beat.title}</div>
                        <div className="text-xs text-gray-500">ID: {beat.id.substring(0, 8)}...</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatNumber(beat.downloads)}</div>
                      <div className="text-xs text-gray-500">downloads</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <div className="font-medium">Downloads Today</div>
                      <div className="text-sm text-gray-500">{downloadStats?.downloadsThisMonth || 0} this month</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{downloadStats?.hourlyDistribution[new Date().getHours()]?.count || 0}</div>
                    <div className="text-xs text-gray-500">last hour</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">New Users Today</div>
                      <div className="text-sm text-gray-500">{userStats?.newUsersThisMonth || 0} this month</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{Math.round((userStats?.newUsersThisMonth || 0) / 30)}</div>
                    <div className="text-xs text-gray-500">daily avg</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Music className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <div className="font-medium">New Beats Added</div>
                      <div className="text-sm text-gray-500">{beatStats?.beatsThisMonth || 0} this month</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{beatStats?.beatsThisMonth || 0}</div>
                    <div className="text-xs text-gray-500">total</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && revenueStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Annual Revenue (ARR)"
              value={formatCurrency(revenueStats.arr)}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Active Subscribers"
              value={formatNumber(revenueStats.activeSubscribers)}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(revenueStats.totalRevenue)}
              icon={TrendingUp}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Chart
              title="Revenue Trend (30 days)"
              data={revenueData}
              color="green"
            />
            
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-6">Revenue Details</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="font-medium">Monthly Recurring Revenue</span>
                  <span className="font-bold text-green-500">{formatCurrency(revenueStats.mrr)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="font-medium">Customer Lifetime Value</span>
                  <span className="font-bold text-green-500">{formatCurrency(revenueStats.ltv)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="font-medium">Monthly Churn Rate</span>
                  <span className="font-bold text-red-500">{revenueStats.churnRate}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="font-medium">Growth Rate</span>
                  <span className={`font-bold ${revenueStats.growthRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {revenueStats.growthRate >= 0 ? '+' : ''}{revenueStats.growthRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && userStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="New Users This Month"
              value={formatNumber(userStats.newUsersThisMonth)}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="User Growth Rate"
              value={`${userStats.userGrowthRate}%`}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              title="User Retention"
              value={`${userStats.userRetention}%`}
              icon={Eye}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Chart
              title="User Growth (30 days)"
              data={userData}
              color="blue"
            />
            
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-6">User Activity</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Total Registered Users</span>
                    <span className="font-bold">{formatNumber(userStats.totalUsers)}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="w-full bg-blue-500 h-2 rounded-full" />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Active Users (30 days)</span>
                    <span className="font-bold">{formatNumber(userStats.activeUsers)}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(userStats.activeUsers / userStats.totalUsers) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Average Session Duration</span>
                    <span className="font-bold">{userStats.avgSessionDuration} minutes</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${(userStats.avgSessionDuration / 30) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beats Tab */}
      {activeTab === 'beats' && beatStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Beats This Month"
              value={formatNumber(beatStats.beatsThisMonth)}
              icon={Music}
              color="yellow"
            />
            <StatCard
              title="Avg Downloads/Beat"
              value={Math.round(beatStats.averageDownloadsPerBeat)}
              icon={Download}
              color="purple"
            />
            <StatCard
              title="Exclusive Beats"
              value={formatNumber(beatStats.exclusiveBeats)}
              icon={Zap}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Genres */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-6">Top Genres by Performance</h3>
              <div className="space-y-4">
                {beatStats.topGenres.map((genre, index) => (
                  <div key={genre.genre} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">#{index + 1}</span>
                        <span className="font-medium">{genre.genre}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatNumber(genre.count)} beats</div>
                        <div className="text-sm text-gray-400">
                          {Math.round(genre.avgDownloads)} avg downloads
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                        style={{ width: `${(genre.avgDownloads / Math.max(...beatStats.topGenres.map(g => g.avgDownloads))) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Profitable Beats */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-6">Most Profitable Beats</h3>
              <div className="space-y-3">
                {beatStats.mostProfitableBeats.map((beat, index) => (
                  <div key={beat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-bold truncate max-w-[180px]">{beat.title}</div>
                        <div className="text-xs text-gray-400">ID: {beat.id.substring(0, 8)}...</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-500">{formatCurrency(beat.revenue)}</div>
                      <div className="text-sm text-gray-400">estimated revenue</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-white/10 text-center">
        <p className="text-sm text-gray-500">
          Analytics update in real-time • Data is cached for performance • 
          <button onClick={exportData} className="ml-2 text-yellow-500 hover:text-yellow-400">
            Export full report
          </button>
        </p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;