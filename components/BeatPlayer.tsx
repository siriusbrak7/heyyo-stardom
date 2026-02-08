import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';

interface BeatPlayerProps {
  beatId: string;
  // Accept either a storage path (e.g., "previews/preview_123.mp3") or a prop named `audioUrl` for compatibility
  audioPath?: string;
  audioUrl?: string;
  title: string;
  producer: string;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

const BeatPlayer: React.FC<BeatPlayerProps> = ({ 
  beatId,
  audioPath, 
  audioUrl,
  title, 
  producer,
  autoPlay = false,
  onPlay,
  onPause,
  onEnd
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  // 1. Resolve Supabase URL or use direct URL
  useEffect(() => {
    const effectivePath = audioPath || audioUrl;

    if (!effectivePath) {
      setError('No audio source provided');
      setIsLoading(false);
      return;
    }

    // If a full URL is provided, use it directly
    if (typeof effectivePath === 'string' && (effectivePath.startsWith('http://') || effectivePath.startsWith('https://'))) {
      setResolvedUrl(effectivePath);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine bucket based on path convention
      const bucketName = effectivePath.startsWith('previews/') ? 'beat-previews' : 'beats';

      // Get the public URL from Supabase
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(effectivePath as string);

      if (data?.publicUrl) {
        setResolvedUrl(data.publicUrl);
      } else {
        throw new Error('Could not resolve public URL');
      }
    } catch (err) {
      console.error('Error resolving audio URL:', err);
      setError('Failed to load audio source');
      setIsLoading(false);
    }
  }, [audioPath, audioUrl]);

  // 2. Initialize Audio when URL is resolved
  useEffect(() => {
    if (!resolvedUrl || !audioRef.current) return;

    const audio = audioRef.current;
    audio.src = resolvedUrl;
    audio.load();

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (autoPlay) {
        audio.play().catch(e => console.warn('Autoplay prevented:', e));
      }
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnd?.();
    };
    const handleError = () => {
      setError('Error playing audio file');
      setIsLoading(false);
      setIsPlaying(false);
    };
    const handlePlayState = () => setIsPlaying(true);
    const handlePauseState = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlayState);
    audio.addEventListener('pause', handlePauseState);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlayState);
      audio.removeEventListener('pause', handlePauseState);
      audio.pause();
      audio.src = '';
    };
  }, [resolvedUrl, autoPlay, onEnd]);

  // Playback Controls
  const togglePlay = () => {
    if (!audioRef.current || isLoading || error) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      onPause?.();
    } else {
      audioRef.current.play().catch(e => console.error('Play error:', e));
      onPlay?.();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span className="text-sm text-red-400">Unavailable</span>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
      
      <div className="flex items-center gap-4">
        {/* Play Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            isPlaying 
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-1" />
          )}
        </button>

        {/* Info & Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={isLoading}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400 disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, #eab308 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 0)`
            }}
          />
          
          <div className="flex justify-between mt-1">
            <div className="truncate pr-4">
              <span className="text-sm font-bold text-white block truncate">{title}</span>
              <span className="text-xs text-gray-400 block truncate">{producer}</span>
            </div>
          </div>
        </div>

        {/* Volume - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            className="w-20 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
        </div>
      </div>
    </div>
  );
};

export default BeatPlayer;