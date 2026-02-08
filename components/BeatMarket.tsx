import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Search, Filter, Play, Pause, Heart, ChevronDown, X, Music, Zap, TrendingUp } from 'lucide-react';
import { Beat, PlanTier } from '../types';
import { fetchBeats } from '../services/beatService';
import { getCurrentUser } from '../services/authService';
import { supabase } from '../supabase';
import BeatPlayer from './BeatPlayer';
import DownloadModal from './DownloadModal';

interface UserProfile {
  id: string;
  plan_tier: PlanTier;
  download_count_this_month: number;
}

// Extracted components for better maintainability
const BeatCard: React.FC<{
  beat: Beat;
  isPlaying: boolean;
  isInWishlist: boolean;
  onPlayToggle: (beatId: string) => void;
  onWishlistToggle: (beatId: string) => void;
  onDownloadClick: (beat: Beat) => void;
}> = ({ beat, isPlaying, isInWishlist, onPlayToggle, onWishlistToggle, onDownloadClick }) => (
  <div className="glass rounded-2xl overflow-hidden group backdrop-blur-sm border border-white/10">
    <div className="relative aspect-square overflow-hidden">
      <img 
        src={beat.coverUrl} 
        alt={beat.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      <button 
        onClick={() => onPlayToggle(beat.id)}
        className="absolute bottom-4 right-4 w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-10"
      >
        {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 ml-1 text-black" />}
      </button>

      {beat.is_exclusive && (
        <div className="absolute top-4 left-4 bg-gradient-to-r from-red-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg z-10">
          🔒 Exclusive
        </div>
      )}

      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-black z-10">
        {beat.bpm} BPM
      </div>
    </div>

    <div className="p-6">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-xl truncate text-white" title={beat.title}>{beat.title}</h3>
        <span className="text-yellow-500 text-sm font-bold">
          {beat.license_required}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-4">by {beat.producer}</p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-bold">
          {beat.genre}
        </span>
        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold">
          {beat.key}
        </span>
        <span className="px-3 py-1 bg-purple-500/10 text-purple-500 rounded-full text-xs font-bold">
          {beat.mood}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>MP3: <strong className="text-green-500">{beat.download_count?.mp3 || 0}</strong></span>
        <span>WAV: <strong className="text-blue-500">{beat.download_count?.wav || 0}</strong></span>
        <span>Stems: <strong className="text-purple-500">{beat.download_count?.stems || 0}</strong></span>
      </div>

      {isPlaying && (
        <div className="mb-4">
          <BeatPlayer 
            audioUrl={beat.audioUrl}
            title={beat.title}
            producer={beat.producer}
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button 
          onClick={() => onWishlistToggle(beat.id)}
          className={`p-2 rounded-lg transition-colors ${isInWishlist ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:bg-white/10'}`}
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className="w-5 h-5" fill={isInWishlist ? 'currentColor' : 'none'} />
        </button>
        
        <div className="flex items-center gap-2">
          {beat.is_exclusive ? (
            <button className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold rounded-lg hover:shadow-lg transition-shadow text-sm">
              Contact for Price
            </button>
          ) : (
            <button 
              onClick={() => onDownloadClick(beat)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg hover:shadow-lg hover:shadow-yellow-500/25 transition-all active:scale-95 text-sm"
            >
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const SearchFilters: React.FC<{
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: 'newest' | 'popular' | 'bpm';
  setSortBy: (sort: 'newest' | 'popular' | 'bpm') => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  selectedBpm: [number, number];
  setSelectedBpm: (bpm: [number, number]) => void;
  selectedKey: string;
  setSelectedKey: (key: string) => void;
  genres: string[];
  keys: string[];
  bpmRange: [number, number];
  clearFilters: () => void;
}> = ({
  searchTerm, setSearchTerm, sortBy, setSortBy, showFilters, setShowFilters,
  selectedGenre, setSelectedGenre, selectedBpm, setSelectedBpm, selectedKey, setSelectedKey,
  genres, keys, bpmRange, clearFilters
}) => (
  <div className="glass rounded-2xl p-6 mb-8 backdrop-blur-sm">
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search beats by title, producer, genre, or mood..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
        />
      </div>

      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'bpm')}
          className="appearance-none px-6 py-3 pr-10 bg-[#0b0b0b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-500/50 transition-colors cursor-pointer"
        >
          <option className="bg-[#0b0b0b] text-white" value="newest">Newest First</option>
          <option className="bg-[#0b0b0b] text-white" value="popular">Most Popular</option>
          <option className="bg-[#0b0b0b] text-white" value="bpm">BPM (Low to High)</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${showFilters ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
      >
        <Filter className="w-5 h-5" />
        Filters
      </button>
    </div>

    {(selectedGenre !== 'All' || selectedKey !== 'All' || selectedBpm[0] !== 60 || selectedBpm[1] !== 180) && (
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-sm text-gray-400">Active filters:</span>
        {selectedGenre !== 'All' && (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-bold flex items-center gap-1">
            Genre: {selectedGenre}
            <button onClick={() => setSelectedGenre('All')} className="hover:text-yellow-300">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {selectedKey !== 'All' && (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-500 rounded-full text-xs font-bold flex items-center gap-1">
            Key: {selectedKey}
            <button onClick={() => setSelectedKey('All')} className="hover:text-blue-300">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {(selectedBpm[0] !== 60 || selectedBpm[1] !== 180) && (
          <span className="px-3 py-1 bg-purple-500/20 text-purple-500 rounded-full text-xs font-bold flex items-center gap-1">
            BPM: {selectedBpm[0]}-{selectedBpm[1]}
            <button onClick={() => setSelectedBpm([60, 180])} className="hover:text-purple-300">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white underline">
          Clear all
        </button>
      </div>
    )}

    {showFilters && (
      <div className="pt-6 border-t border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold mb-3 text-white">Genre</label>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedGenre === genre ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-3 text-white">
              BPM Range: {selectedBpm[0]} - {selectedBpm[1]}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min={bpmRange[0]}
                max={bpmRange[1]}
                value={selectedBpm[0]}
                onChange={(e) => setSelectedBpm([parseInt(e.target.value), selectedBpm[1]])}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <input
                type="range"
                min={bpmRange[0]}
                max={bpmRange[1]}
                value={selectedBpm[1]}
                onChange={(e) => setSelectedBpm([selectedBpm[0], parseInt(e.target.value)])}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-3 text-white">Key</label>
            <div className="flex flex-wrap gap-2">
              {keys.map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedKey === key ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);

const BeatMarket: React.FC = () => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedBpm, setSelectedBpm] = useState<[number, number]>([60, 180]);
  const [selectedKey, setSelectedKey] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'bpm'>('newest');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedBeat, setSelectedBeat] = useState<Beat | null>(null);

  useEffect(() => {
    loadBeats();
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadWishlist();
      loadUserProfile();
    }
  }, [user]);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, plan_tier, download_count_this_month')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, [user]);

  const loadWishlist = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('beat_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setWishlist(new Set(data.map(item => item.beat_id)));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  }, [user]);

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

  const { genres, keys, bpmRange } = useMemo(() => {
    const uniqueGenres = ['All', ...new Set(beats.map(beat => beat.genre).filter(Boolean))];
    const uniqueKeys = ['All', ...new Set(beats.map(beat => beat.key).filter(Boolean))];
    const bpms = beats.map(beat => beat.bpm).filter(bpm => bpm > 0);
    
    return {
      genres: uniqueGenres,
      keys: uniqueKeys,
      bpmRange: bpms.length > 0 ? [Math.min(...bpms), Math.max(...bpms)] as [number, number] : [60, 180] as [number, number]
    };
  }, [beats]);

  const filteredBeats = useMemo(() => {
    let filtered = [...beats];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(beat => 
        beat.title.toLowerCase().includes(term) ||
        beat.producer.toLowerCase().includes(term) ||
        beat.genre.toLowerCase().includes(term) ||
        beat.mood.toLowerCase().includes(term)
      );
    }

    if (selectedGenre !== 'All') {
      filtered = filtered.filter(beat => beat.genre === selectedGenre);
    }

    filtered = filtered.filter(beat => 
      beat.bpm >= selectedBpm[0] && beat.bpm <= selectedBpm[1]
    );

    if (selectedKey !== 'All') {
      filtered = filtered.filter(beat => beat.key === selectedKey);
    }

    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => {
          const aDownloads = (a.download_count?.mp3 || 0) + (a.download_count?.wav || 0) + (a.download_count?.stems || 0);
          const bDownloads = (b.download_count?.mp3 || 0) + (b.download_count?.wav || 0) + (b.download_count?.stems || 0);
          return bDownloads - aDownloads;
        });
        break;
      case 'bpm':
        filtered.sort((a, b) => a.bpm - b.bpm);
        break;
      default:
        break;
    }

    return filtered;
  }, [beats, searchTerm, selectedGenre, selectedBpm, selectedKey, sortBy]);

  const toggleWishlist = useCallback(async (beatId: string) => {
    if (!user) {
      alert('Please sign in to add beats to your wishlist');
      return;
    }

    const newWishlist = new Set(wishlist);
    
    try {
      if (newWishlist.has(beatId)) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('beat_id', beatId);
        
        newWishlist.delete(beatId);
      } else {
        await supabase
          .from('wishlists')
          .insert([{ user_id: user.id, beat_id: beatId }]);
        
        newWishlist.add(beatId);
      }
      
      setWishlist(newWishlist);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      alert('Failed to update wishlist. Please try again.');
    }
  }, [user, wishlist]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedGenre('All');
    setSelectedBpm([60, 180]);
    setSelectedKey('All');
    setSortBy('newest');
  }, []);

  const handleDownloadClick = useCallback((beat: Beat) => {
    if (!user) {
      alert('Please sign in to download beats');
      return;
    }

    if (!userProfile) {
      alert('Loading your profile...');
      return;
    }

    const requiredPlans: PlanTier[] = ['Basic', 'Pro', 'Exclusive'];
    const userPlanIndex = requiredPlans.indexOf(userProfile.plan_tier);
    const beatPlanIndex = requiredPlans.indexOf(beat.license_required);

    if (userPlanIndex < beatPlanIndex) {
      alert(`This beat requires ${beat.license_required} plan or higher. Please upgrade your account.`);
      return;
    }

    if (userProfile.plan_tier === 'Basic' && userProfile.download_count_this_month >= 30) {
      alert('You have reached your monthly download limit (30). Upgrade to Pro for unlimited downloads!');
      return;
    }

    setSelectedBeat(beat);
    setShowDownloadModal(true);
  }, [user, userProfile]);

  const handlePlayToggle = useCallback((beatId: string) => {
    setPlayingBeatId(prev => prev === beatId ? null : beatId);
  }, []);

  const totalDownloads = useMemo(() => 
    beats.reduce((total, beat) => 
      total + (beat.download_count?.mp3 || 0) + (beat.download_count?.wav || 0) + (beat.download_count?.stems || 0), 
    0), 
  [beats]);

  return (
    <section id="marketplace" className="py-20 px-4 bg-gradient-to-b from-black to-gray-900/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-black" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight italic text-white">Beat Marketplace</h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Browse, preview, and download premium beats from top producers. New beats added weekly.
          </p>
        </div>

        <div className="glass rounded-2xl p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{beats.length}</p>
              <p className="text-sm text-gray-400">Total Beats</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{totalDownloads.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Downloads</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{genres.length - 1}</p>
              <p className="text-sm text-gray-400">Genres</p>
            </div>
          </div>
        </div>

        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          selectedBpm={selectedBpm}
          setSelectedBpm={setSelectedBpm}
          selectedKey={selectedKey}
          setSelectedKey={setSelectedKey}
          genres={genres}
          keys={keys}
          bpmRange={bpmRange}
          clearFilters={clearFilters}
        />

        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">
            Showing <span className="text-white font-bold">{filteredBeats.length}</span> of{' '}
            <span className="text-white font-bold">{beats.length}</span> beats
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <X className="w-4 h-4" /> Clear search
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBeats.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center backdrop-blur-sm">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">No beats found</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm ? 'Try different search terms or filters' : 'No beats available yet'}
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBeats.map((beat) => (
              <BeatCard
                key={beat.id}
                beat={beat}
                isPlaying={playingBeatId === beat.id}
                isInWishlist={wishlist.has(beat.id)}
                onPlayToggle={handlePlayToggle}
                onWishlistToggle={toggleWishlist}
                onDownloadClick={handleDownloadClick}
              />
            ))}
          </div>
        )}

        {selectedBeat && showDownloadModal && (
          <DownloadModal
            beat={selectedBeat}
            isOpen={showDownloadModal}
            onClose={() => {
              setShowDownloadModal(false);
              setSelectedBeat(null);
            }}
            onDownloadSuccess={(format) => {
              console.log(`Downloaded ${format} for beat: ${selectedBeat.title}`);
              loadBeats();
              if (user) {
                loadUserProfile();
              }
            }}
          />
        )}
      </div>
    </section>
  );
};

export default BeatMarket;