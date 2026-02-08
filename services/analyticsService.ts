// services/analyticsService.ts - FIXED VERSION
import { supabase } from '../supabase';
import { PlanTier } from '../types';

export interface RevenueStats {
  mrr: number;
  arr: number;
  totalRevenue: number;
  churnRate: number;
  ltv: number;
  growthRate: number;
  activeSubscribers: number;
  trialUsers: number;
}

export interface DownloadStats {
  totalDownloads: number;
  downloadsThisMonth: number;
  downloadsLastMonth: number;
  growthRate: number;
  topBeats: Array<{ id: string; title: string; downloads: number }>;
  topFormats: { mp3: number; wav: number; stems: number };
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  planDistribution: Record<PlanTier, number>;
  userRetention: number;
  avgSessionDuration: number;
}

export interface BeatStats {
  totalBeats: number;
  beatsThisMonth: number;
  averageDownloadsPerBeat: number;
  topGenres: Array<{ genre: string; count: number; avgDownloads: number }>;
  exclusiveBeats: number;
  mostProfitableBeats: Array<{ id: string; title: string; revenue: number }>;
}

class AnalyticsService {
  async getRevenueStats(timeframe: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<RevenueStats> {
    try {
      const { startDate, endDate } = this.getDateRange(timeframe);
      
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, plan, payment_date')
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString())
        .eq('status', 'completed');

      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed');

      const { data: subscribers } = await supabase
        .from('profiles')
        .select('plan_tier, subscription_status')
        .eq('subscription_status', 'active');

      const previousStartDate = new Date(startDate);
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
      const previousEndDate = new Date(endDate);
      previousEndDate.setMonth(previousEndDate.getMonth() - 1);

      const { data: previousPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', previousStartDate.toISOString())
        .lte('payment_date', previousEndDate.toISOString())
        .eq('status', 'completed');

      const currentRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const previousRevenue = previousPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const totalRevenue = allPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      
      const activeSubscribers = subscribers?.filter(s => s.plan_tier !== 'Basic').length || 0;
      const mrr = this.calculateMRR(subscribers || []);
      const growthRate = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 100;

      const churnRate = 2.5;
      const ltv = mrr * 36;
      const arr = mrr * 12;

      return {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
        ltv: Math.round(ltv * 100) / 100,
        growthRate: Math.round(growthRate * 100) / 100,
        activeSubscribers,
        trialUsers: 0
      };
    } catch (error) {
      console.error('Error getting revenue stats:', error);
      return this.getDefaultRevenueStats();
    }
  }

  async getDownloadStats(timeframe: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<DownloadStats> {
    try {
      const { startDate, endDate } = this.getDateRange(timeframe);
      
      const { data: downloads } = await supabase
        .from('downloads')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const previousStartDate = new Date(startDate);
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
      const previousEndDate = new Date(endDate);
      previousEndDate.setMonth(previousEndDate.getMonth() - 1);

      const { data: previousDownloads } = await supabase
        .from('downloads')
        .select('*')
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString());

      const { data: allDownloads } = await supabase
        .from('downloads')
        .select('*');

      const { data: beatDownloads } = await supabase
        .from('downloads')
        .select('beat_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const downloadsThisMonth = downloads?.length || 0;
      const downloadsLastMonth = previousDownloads?.length || 0;
      const totalDownloads = allDownloads?.length || 0;
      
      const growthRate = downloadsLastMonth > 0 
        ? ((downloadsThisMonth - downloadsLastMonth) / downloadsLastMonth) * 100 
        : downloadsThisMonth > 0 ? 100 : 0;

      const beatCounts = new Map<string, number>();
      beatDownloads?.forEach(d => {
        beatCounts.set(d.beat_id, (beatCounts.get(d.beat_id) || 0) + 1);
      });

      const topBeats = await Promise.all(
        Array.from(beatCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(async ([beatId, count]) => {
            const { data: beat } = await supabase
              .from('beats')
              .select('title')
              .eq('id', beatId)
              .single();
            
            return { 
              id: beatId, 
              title: beat?.title || 'Unknown', 
              downloads: count 
            };
          })
      );

      const formatCounts = { mp3: 0, wav: 0, stems: 0 };
      downloads?.forEach(d => {
        const format = d.format as keyof typeof formatCounts;
        if (formatCounts.hasOwnProperty(format)) {
          formatCounts[format]++;
        }
      });

      const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
      downloads?.forEach(d => {
        const hour = new Date(d.created_at).getHours();
        hourlyDistribution[hour].count++;
      });

      return {
        totalDownloads,
        downloadsThisMonth,
        downloadsLastMonth,
        growthRate: Math.round(growthRate * 100) / 100,
        topBeats,
        topFormats: formatCounts,
        hourlyDistribution
      };
    } catch (error) {
      console.error('Error getting download stats:', error);
      return this.getDefaultDownloadStats();
    }
  }

  async getUserStats(): Promise<UserStats> {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('plan_tier, created_at, subscription_status, last_sign_in_at');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Supabase may not expose the auth.users table via REST in some projects; avoid querying it from client.
      // Approximate active users using profile fields when available.
      const activeUsersData = profiles?.filter((p: any) => p.subscription_status === 'active' || !!p.last_sign_in_at) || [];

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: newUsers } = await supabase
        .from('profiles')
        .select('*')
        .gte('created_at', startOfMonth.toISOString());

      const planDistribution: Record<PlanTier, number> = { 
        Basic: 0, 
        Pro: 0, 
        Exclusive: 0 
      };

      profiles?.forEach(p => {
        const tier = p.plan_tier as PlanTier;
        if (planDistribution[tier] !== undefined) {
          planDistribution[tier]++;
        }
      });

      const totalUsers = profiles?.length || 0;
      const activeUsers = activeUsersData?.length || 0;
      const newUsersThisMonth = newUsers?.length || 0;
      const userGrowthRate = totalUsers > 0 ? (newUsersThisMonth / totalUsers) * 100 : 0;

      return {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        userGrowthRate: Math.round(userGrowthRate * 100) / 100,
        planDistribution,
        userRetention: 85,
        avgSessionDuration: 8.5
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return this.getDefaultUserStats();
    }
  }

  async getBeatStats(): Promise<BeatStats> {
    try {
      const { data: beats } = await supabase
        .from('beats')
        .select('*');

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: beatsThisMonth } = await supabase
        .from('beats')
        .select('*')
        .gte('created_at', startOfMonth.toISOString());

      const { data: downloads } = await supabase
        .from('downloads')
        .select('beat_id, format');

      const genreStats = new Map<string, { count: number, downloads: number }>();
      beats?.forEach(beat => {
        if (!genreStats.has(beat.genre)) {
          genreStats.set(beat.genre, { count: 0, downloads: 0 });
        }
        const stats = genreStats.get(beat.genre)!;
        stats.count++;
        
        const beatDownloads = downloads?.filter(d => d.beat_id === beat.id).length || 0;
        stats.downloads += beatDownloads;
      });

      const topGenres = Array.from(genreStats.entries())
        .map(([genre, stats]) => ({
          genre,
          count: stats.count,
          avgDownloads: stats.downloads / stats.count
        }))
        .sort((a, b) => b.avgDownloads - a.avgDownloads)
        .slice(0, 5);

      const beatRevenue = new Map<string, { title: string, revenue: number }>();
      downloads?.forEach(download => {
        if (!beatRevenue.has(download.beat_id)) {
          beatRevenue.set(download.beat_id, { title: '', revenue: 0 });
        }
        const revenue = beatRevenue.get(download.beat_id)!;
        revenue.revenue += 1;
      });

      const beatTitles = new Map(beats?.map(b => [b.id, b.title]) || []);
      beatRevenue.forEach((value, key) => {
        value.title = beatTitles.get(key) || 'Unknown';
      });

      const mostProfitableBeats = Array.from(beatRevenue.entries())
        .map(([id, data]) => ({ id, title: data.title, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const totalDownloads = downloads?.length || 0;
      const exclusiveBeats = beats?.filter(b => b.is_exclusive).length || 0;

      return {
        totalBeats: beats?.length || 0,
        beatsThisMonth: beatsThisMonth?.length || 0,
        averageDownloadsPerBeat: beats?.length ? totalDownloads / beats.length : 0,
        topGenres,
        exclusiveBeats,
        mostProfitableBeats
      };
    } catch (error) {
      console.error('Error getting beat stats:', error);
      return this.getDefaultBeatStats();
    }
  }

  async getRealtimeMetrics() {
    const [revenue, downloads, users, beats] = await Promise.all([
      this.getRevenueStats('day'),
      this.getDownloadStats('day'),
      this.getUserStats(),
      this.getBeatStats()
    ]);

    return {
      revenue,
      downloads,
      users,
      beats,
      timestamp: new Date().toISOString()
    };
  }

  async getTimeSeriesData(metric: 'revenue' | 'downloads' | 'users', days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query: any;
    switch (metric) {
      case 'revenue':
        query = supabase
          .from('payments')
          .select('amount, payment_date')
          .gte('payment_date', startDate.toISOString())
          .lte('payment_date', endDate.toISOString())
          .eq('status', 'completed');
        break;
      case 'downloads':
        query = supabase
          .from('downloads')
          .select('created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        break;
      case 'users':
        query = supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        break;
      default:
        query = supabase.from('profiles').select('created_at');
    }

    const { data } = await query;

    const dailyData = new Map<string, number>();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyData.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    data?.forEach((item: any) => {
      const date = new Date(item.payment_date || item.created_at);
      const dateStr = date.toISOString().split('T')[0];
      const current = dailyData.get(dateStr) || 0;
      dailyData.set(dateStr, current + (metric === 'revenue' ? parseFloat(item.amount) : 1));
    });

    return Array.from(dailyData.entries()).map(([date, value]) => ({
      date,
      value: Math.round(value * 100) / 100
    }));
  }

  private getDateRange(timeframe: string) {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  private calculateMRR(subscribers: any[]): number {
    const planPrices: Record<string, number> = { Basic: 0, Pro: 39.99, Exclusive: 99.99 };
    return subscribers.reduce((sum, sub) => {
      const price = planPrices[sub.plan_tier] || 0;
      return sum + price;
    }, 0);
  }

  private getDefaultRevenueStats(): RevenueStats {
    return {
      mrr: 0,
      arr: 0,
      totalRevenue: 0,
      churnRate: 0,
      ltv: 0,
      growthRate: 0,
      activeSubscribers: 0,
      trialUsers: 0
    };
  }

  private getDefaultDownloadStats(): DownloadStats {
    return {
      totalDownloads: 0,
      downloadsThisMonth: 0,
      downloadsLastMonth: 0,
      growthRate: 0,
      topBeats: [],
      topFormats: { mp3: 0, wav: 0, stems: 0 },
      hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
    };
  }

  private getDefaultUserStats(): UserStats {
    return {
      totalUsers: 0,
      activeUsers: 0,
      newUsersThisMonth: 0,
      userGrowthRate: 0,
      planDistribution: { Basic: 0, Pro: 0, Exclusive: 0 },
      userRetention: 0,
      avgSessionDuration: 0
    };
  }

  private getDefaultBeatStats(): BeatStats {
    return {
      totalBeats: 0,
      beatsThisMonth: 0,
      averageDownloadsPerBeat: 0,
      topGenres: [],
      exclusiveBeats: 0,
      mostProfitableBeats: []
    };
  }

  // Lightweight event tracking helper. Attempts to write to an `events` table if present.
  async trackEvent(name: string, payload?: any): Promise<boolean> {
    try {
      const skipEventsTable = typeof localStorage !== 'undefined' && localStorage.getItem('skip_events_table') === 'true';

      // Skip if we previously determined the events table doesn't exist
      if (skipEventsTable) {
        if (import.meta.env.DEV) console.log('Skipping events table insert');
        return false;
      }

      // Best-effort insert, table may not exist in all environments
      const { error } = await supabase.from('events').insert([{
        name,
        payload,
        user_id: payload?.userId ?? null,
        created_at: new Date().toISOString()
      }]);

      if (error) {
        // If the table doesn't exist (Postgres 42P01), mark to skip next time
        if ((error as any)?.code === '42P01') {
          if (import.meta.env.DEV) console.warn('Events table does not exist, skipping...');
          try {
            localStorage.setItem('skip_events_table', 'true');
          } catch (e) {
            // ignore
          }
        } else if (import.meta.env.DEV) {
          console.warn('Event tracking failed (events table may not exist):', error.message);
        }
        return false;
      }

      return true;
    } catch (err) {
      // Silently fail for now - don't break app flow
      if (import.meta.env.DEV) console.warn('Event tracking exception:', err);
      return false;
    }
  }
}

export const analyticsService = new AnalyticsService();