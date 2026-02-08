import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Music,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { AudioService } from '../services/audioService';
import Visualizer from './Visualizer';

// ⬇️ MUST exist in your app (Supabase / Auth service)
import { getCurrentUser } from '../services/authService';

const DEMO_AUDIO_URLS = [
  'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  'https://cdn.pixabay.com/download/audio/2022/03/15/audio_6a8e6f2c3a.mp3',
];

const BASE_BPM = 128;

const Hero: React.FC = () => {
  const [audioService] = useState(() => new AudioService());

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpmMultiplier, setBpmMultiplier] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  /* -------------------- AUDIO INIT -------------------- */
  useEffect(() => {
    let cancelled = false;

    const initAudio = async () => {
      try {
        const user = await getCurrentUser();

        // ❗ Only load hero demo audio if NOT logged in
        if (user) return;

        for (const url of DEMO_AUDIO_URLS) {
          const ok = await audioService.loadAudio(url);
          if (ok) {
            if (!cancelled) setIsLoaded(true);
            return;
          }
        }

        if (!cancelled) setLoadError(true);
      } catch (e) {
        console.error('Hero audio init failed:', e);
        if (!cancelled) setLoadError(true);
      }
    };

    initAudio();

    return () => {
      cancelled = true;
      audioService.cleanup();
    };
  }, [audioService]);

  /* -------------------- CONTROLS -------------------- */
  const togglePlay = () => {
    if (!isLoaded) return;

    if (isPlaying) {
      audioService.pause();
    } else {
      audioService.play();
    }

    setIsPlaying((v) => !v);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBpmMultiplier(val);
    // Playback rate can be adjusted if needed
  };

  /* -------------------- UI -------------------- */
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] -z-10 animate-pulse" />

      <div className="w-full max-w-6xl mx-auto text-center space-y-8">
        {/* Headline */}
        <div className="space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-semibold tracking-wider uppercase border border-yellow-500/20">
            Professional Beats for Every Budget
          </span>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 leading-tight">
            Elevate Your <span className="text-yellow-500">Stardom</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium">
            Join 500+ top producers. Instant access to high-fidelity beats, stems,
            and exclusive commercial rights.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
          <button className="group relative px-8 py-4 bg-yellow-500 text-black font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/25 flex items-center gap-2">
            Browse All Beats
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href="#plans"
            className="px-8 py-4 bg-white/5 text-white font-bold rounded-xl transition-all hover:bg-white/10 border border-white/10 active:scale-95"
          >
            View Plans
          </a>
        </div>

        {/* Audio Widget */}
        <div className="mt-12 glass rounded-3xl p-8 max-w-3xl mx-auto w-full relative overflow-hidden">
          {loadError ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-gray-400">
              <AlertCircle className="w-12 h-12 text-red-500/50" />
              <p className="font-medium">Demo audio could not be loaded.</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-yellow-500 underline"
              >
                Reload
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Play Button */}
              <div className="relative">
                <button
                  onClick={togglePlay}
                  disabled={!isLoaded}
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
                    isPlaying
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  } ${!isLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" />
                  )}
                </button>

                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black p-1.5 rounded-lg">
                  <Music className="w-4 h-4" />
                </div>
              </div>

              {/* Controls */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex justify-between items-end">
                  <div className="text-left">
                    <h3 className="font-bold text-xl">Interactive Demo</h3>
                    <p className="text-gray-400 text-sm">
                      Real-time tempo shifting
                    </p>
                  </div>

                  <span className="text-yellow-500 font-mono text-2xl font-bold">
                    {Math.round(BASE_BPM * bpmMultiplier)}{' '}
                    <span className="text-sm text-gray-500">BPM</span>
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <SlidersHorizontal className="w-5 h-5 text-gray-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={bpmMultiplier}
                    onChange={handleBpmChange}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                </div>

                <div className="pt-2 h-20 flex items-center justify-center">
                  <Visualizer
                    getFrequencyData={() =>
                      new Uint8Array(0)
                    }
                    isActive={isPlaying}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
