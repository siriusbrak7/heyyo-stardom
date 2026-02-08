import React, { useState, useRef, useEffect } from 'react';
import { 
  Scissors, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Download,
  FileAudio // Added as requested
} from 'lucide-react';

interface AudioCutterProps {
  audioFile: File;
  onCut: (blob: Blob) => void;
  duration?: number; // Default 30 seconds
}

const AudioCutter: React.FC<AudioCutterProps> = ({ audioFile, onCut, duration = 30 }) => {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(duration);
  const [isCutting, setIsCutting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load audio file
  useEffect(() => {
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
      setEndTime(Math.min(duration, audio.duration));
    };
    
    return () => URL.revokeObjectURL(url);
  }, [audioFile, duration]);

  // Audio playback controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    // Stop at end time
    if (time >= endTime) {
      audioRef.current.pause();
      setIsPlaying(false);
      audioRef.current.currentTime = startTime;
    }
  };

  // Draw waveform
  useEffect(() => {
    const drawWaveform = async () => {
      if (!canvasRef.current || !audioUrl) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Load audio data
      const audioContext = new AudioContext();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const data = audioBuffer.getChannelData(0);
      const width = canvas.width;
      const height = canvas.height;
      const sliceWidth = width / data.length;
      
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      
      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4ade80';
      ctx.beginPath();
      
      for (let i = 0; i < data.length; i++) {
        const x = i * sliceWidth;
        const y = (data[i] * height / 2) + height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Draw selection area
      const startX = (startTime / audioDuration) * width;
      const endX = (endTime / audioDuration) * width;
      
      ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Draw start/end markers
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(startX - 2, 0, 4, height);
      ctx.fillRect(endX - 2, 0, 4, height);
    };
    
    if (audioDuration > 0) {
      drawWaveform();
    }
  }, [audioUrl, startTime, endTime, audioDuration]);

  // Handle cut
  const handleCut = async () => {
    if (!audioUrl) return;
    
    setIsCutting(true);
    
    try {
      // Load the full audio
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create new buffer for clip
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const durationSamples = endSample - startSample;
      
      const newBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        durationSamples,
        sampleRate
      );
      
      // Copy data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const newChannelData = newBuffer.getChannelData(channel);
        
        for (let i = 0; i < durationSamples; i++) {
          newChannelData[i] = channelData[startSample + i];
        }
      }
      
      // Convert to WAV blob
      const wavBlob = await audioBufferToWav(newBuffer);
      onCut(wavBlob);
      
    } catch (error) {
      console.error('Cutting error:', error);
    } finally {
      setIsCutting(false);
    }
  };

  // Helper: Convert AudioBuffer to WAV blob
  const audioBufferToWav = (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const numChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;
      
      const bytesPerSample = bitDepth / 8;
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = buffer.length * blockAlign;
      
      const bufferSize = 44 + dataSize;
      const arrayBuffer = new ArrayBuffer(bufferSize);
      const view = new DataView(arrayBuffer);
      
      // Write WAV header
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitDepth, true);
      writeString(view, 36, 'data');
      view.setUint32(40, dataSize, true);
      
      // Write audio data
      let offset = 44;
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
          offset += 2;
        }
      }
      
      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
    });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  return (
    <div className="space-y-6 p-6 bg-black/50 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
            <Scissors className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Audio Cutter</h3>
            <p className="text-sm text-gray-400">Select 30-second preview</p>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {audioDuration.toFixed(1)}s total
        </div>
      </div>

      {/* Waveform */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={120}
          className="w-full h-30 rounded-lg bg-black cursor-crosshair"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const time = percentage * audioDuration;
            
            if (Math.abs(time - startTime) < Math.abs(time - endTime)) {
              setStartTime(Math.max(0, Math.min(time, endTime - 1)));
            } else {
              setEndTime(Math.min(audioDuration, Math.max(time, startTime + 1)));
            }
          }}
        />
        
        {/* Time markers */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{startTime.toFixed(1)}s</span>
          <span>{(endTime - startTime).toFixed(1)}s selected</span>
          <span>{endTime.toFixed(1)}s</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Start Time (seconds)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max={audioDuration - 1}
                step="0.1"
                value={startTime}
                onChange={(e) => setStartTime(Math.min(parseFloat(e.target.value), endTime - 1))}
                className="flex-1 accent-green-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <span className="w-16 text-center font-mono text-sm">{startTime.toFixed(1)}s</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2">End Time (seconds)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max={audioDuration}
                step="0.1"
                value={endTime}
                onChange={(e) => setEndTime(Math.max(parseFloat(e.target.value), startTime + 1))}
                className="flex-1 accent-green-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <span className="w-16 text-center font-mono text-sm">{endTime.toFixed(1)}s</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => {
                setStartTime(0);
                setEndTime(Math.min(30, audioDuration));
              }}
              className="text-green-500 hover:text-green-400 font-medium"
            >
              Reset to 30s
            </button>
            <span className="text-gray-400">
              Duration: {(endTime - startTime).toFixed(1)}s
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            hidden
          />
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStartTime(Math.max(0, startTime - 5))}
              className="p-3 hover:bg-white/10 rounded-xl transition-colors"
              title="Back 5s"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlay}
              className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-green-500/20"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-black" />
              ) : (
                <Play className="w-6 h-6 ml-1 text-black" />
              )}
            </button>
            
            <button
              onClick={() => setEndTime(Math.min(audioDuration, endTime + 5))}
              className="p-3 hover:bg-white/10 rounded-xl transition-colors"
              title="Forward 5s"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={handleCut}
            disabled={isCutting || (endTime - startTime) > 31}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              isCutting || (endTime - startTime) > 31
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-black hover:shadow-lg hover:shadow-green-500/30 active:scale-95'
            }`}
          >
            {isCutting ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                Cut Preview
              </>
            )}
          </button>
          
          {(endTime - startTime) > 31 && (
            <p className="text-xs text-red-500 text-center font-bold animate-pulse">
              Preview must be ≤ 30s
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioCutter;