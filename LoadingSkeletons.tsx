import React from 'react';

// Beat Card Skeleton
export const BeatCardSkeleton: React.FC = () => (
  <div className="glass rounded-2xl overflow-hidden animate-pulse">
    <div className="aspect-square bg-white/10" />
    <div className="p-6">
      <div className="flex justify-between items-start mb-2">
        <div className="h-6 bg-white/10 rounded w-2/3" />
        <div className="h-5 bg-white/10 rounded w-16" />
      </div>
      <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
      
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-6 bg-white/10 rounded w-16" />
        <div className="h-6 bg-white/10 rounded w-16" />
        <div className="h-6 bg-white/10 rounded w-16" />
      </div>
      
      <div className="flex items-center gap-4 text-xs mb-4">
        <div className="h-4 bg-white/10 rounded w-12" />
        <div className="h-4 bg-white/10 rounded w-12" />
        <div className="h-4 bg-white/10 rounded w-12" />
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="h-10 w-10 bg-white/10 rounded-lg" />
        <div className="h-10 bg-white/10 rounded-lg w-24" />
      </div>
    </div>
  </div>
);

// Dashboard Stats Skeleton
export const StatsSkeleton: React.FC = () => (
  <div className="glass rounded-2xl p-6 backdrop-blur-sm animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-5 bg-white/10 rounded w-1/3" />
      <div className="h-10 w-10 bg-white/10 rounded-xl" />
    </div>
    <div className="h-8 bg-white/10 rounded w-1/2 mb-2" />
    <div className="h-4 bg-white/10 rounded w-1/3" />
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <div className="h-4 bg-white/10 rounded" />
      </td>
    ))}
  </tr>
);

// Beat List Skeleton
export const BeatListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl animate-pulse">
        <div className="w-12 h-12 bg-white/10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded w-1/3" />
          <div className="h-3 bg-white/10 rounded w-1/4" />
        </div>
        <div className="h-8 w-8 bg-white/10 rounded-lg" />
      </div>
    ))}
  </div>
);

// Full Page Loading
export const PageLoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-black p-4">
    <div className="max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-xl" />
          <div>
            <div className="h-6 bg-white/10 rounded w-32 mb-2" />
            <div className="h-3 bg-white/10 rounded w-24" />
          </div>
        </div>
        <div className="h-10 w-24 bg-white/10 rounded-xl" />
      </div>
      
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsSkeleton key={i} />
        ))}
      </div>
      
      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6 backdrop-blur-sm animate-pulse">
            <div className="h-6 bg-white/10 rounded w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-14 h-14 bg-white/10 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-white/10 rounded-lg" />
                    <div className="h-8 w-8 bg-white/10 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 backdrop-blur-sm animate-pulse">
            <div className="h-6 bg-white/10 rounded w-32 mb-6" />
            <BeatListSkeleton count={3} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Chart Skeleton
export const ChartSkeleton: React.FC = () => (
  <div className="glass rounded-2xl p-6 animate-pulse">
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="h-5 bg-white/10 rounded w-32 mb-2" />
        <div className="h-3 bg-white/10 rounded w-24" />
      </div>
      <div className="h-8 bg-white/10 rounded w-24" />
    </div>
    <div className="h-64 bg-white/10 rounded-xl" />
  </div>
);

// Button Skeleton
export const ButtonSkeleton: React.FC<{ width?: string }> = ({ width = 'w-32' }) => (
  <div className={`h-10 ${width} bg-white/10 rounded-xl animate-pulse`} />
);

// Input Skeleton
export const InputSkeleton: React.FC = () => (
  <div className="space-y-2">
    <div className="h-4 bg-white/10 rounded w-24" />
    <div className="h-12 bg-white/10 rounded-xl" />
  </div>
);

// Export all skeletons
export const LoadingSkeletons = {
  BeatCard: BeatCardSkeleton,
  Stats: StatsSkeleton,
  TableRow: TableRowSkeleton,
  BeatList: BeatListSkeleton,
  Page: PageLoadingSkeleton,
  Chart: ChartSkeleton,
  Button: ButtonSkeleton,
  Input: InputSkeleton
};

export default LoadingSkeletons;