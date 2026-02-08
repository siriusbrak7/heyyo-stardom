// types.ts - COMPLETE VERSION
export type PlanTier = 'Basic' | 'Pro' | 'Exclusive';
export type SubscriptionStatus = 'pending' | 'active' | 'disabled' | 'failed' | 'cancelled';
export type DownloadFormat = 'mp3' | 'wav' | 'stems';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface User {
  id: string;
  email: string;
  plan_tier: PlanTier;
  subscription_status: SubscriptionStatus;
  paystack_customer_code?: string;
  download_count_this_month: number;
  joined_at: string;
  updated_at?: string;
  referral_code?: string;
  referral_earnings?: number;
  wishlist?: string[];
  last_download_at?: string;
}

export interface Beat {
  id: string;
  title: string;
  producer: string;
  bpm: number;
  key: string;
  genre: string;
  mood: string;
  coverUrl: string;
  audioUrl: string;
  mp3Url: string;
  wavUrl?: string;
  stemsUrl?: string;
  is_exclusive: boolean;
  license_required: PlanTier;
  download_count?: {
    mp3: number;
    wav: number;
    stems: number;
  };
  created_at?: string;
  updated_at?: string;
  price?: number;
  duration?: number;
}

export interface PricingTier {
  name: PlanTier;
  price: string;
  features: string[];
  badge?: string;
  primary?: boolean;
  formats: DownloadFormat[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderType: 'user' | 'admin' | 'system';
  text: string;
  timestamp: number;
  read?: boolean;
}

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

export interface PromoCode {
  code: string;
  discount: number;
  tier: PlanTier | 'All';
  expires: string;
  used_count?: number;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  pitch: number;
  isLoading: boolean;
  error?: string;
}

export interface DownloadRecord {
  id: string;
  user_id: string;
  beat_id: string;
  format: DownloadFormat;
  license_tier: PlanTier;
  created_at: string;
  file_size?: number;
  ip_address?: string;
}

export interface AnalyticsData {
  date: string;
  downloads: number;
  revenue: number;
  users: number;
  beats: number;
}

export interface AdminUser {
  user_id: string;
  email: string;
  is_super_admin: boolean;
  permissions: string[];
  created_at: string;
  updated_at?: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  beat_id: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  plan: PlanTier;
  amount: string;
  currency: string;
  status: PaymentStatus;
  payment_date: string;
  paystack_reference?: string;
  created_at: string;
}

export interface DownloadStats {
  totalDownloads: number;
  downloadsThisMonth: number;
  downloadsLastMonth: number;
  growthRate: number;
  topBeats: Array<{ id: string; title: string; downloads: number }>;
  topFormats: Record<DownloadFormat, number>;
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

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  action_url?: string;
}

export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Component Props Types
export interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export interface AdminDashboardProps {
  onLogout: () => void;
  currentUser?: User;
}

export interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  defaultMode?: 'login' | 'signup';
}

export interface PaystackModalProps {
  plan: PlanTier;
  price: string;
  onSuccess: () => void;
  onClose: () => void;
}

export interface BeatPlayerProps {
  audioUrl: string;
  title: string;
  producer: string;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

export interface DownloadModalProps {
  beat: Beat;
  isOpen: boolean;
  onClose: () => void;
  onDownloadSuccess: (format: DownloadFormat) => void;
}