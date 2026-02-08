import React, { useEffect, useRef, useState } from 'react';

interface VisualizerProps {
  getFrequencyData?: () => Uint8Array;
  isActive: boolean;
  color?: string;
  intensity?: number;
  bars?: number;
  width?: number;
  height?: number;
  type?: 'bars' | 'circle' | 'wave' | 'particles';
}

const Visualizer: React.FC<VisualizerProps> = ({ 
  getFrequencyData, 
  isActive, 
  color = '#eab308',
  intensity = 1.0,
  bars = 32,
  width = 300,
  height = 80,
  type = 'bars'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(bars));
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(bars).fill(0));
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio context on user interaction
  const initializeAudioContext = async () => {
    if (audioContextRef.current || !isActive) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  };

  // Handle user interaction for audio context
  useEffect(() => {
    if (isActive && !isInitialized) {
      const handleInteraction = () => {
        initializeAudioContext();
        document.removeEventListener('click', handleInteraction);
      };
      
      document.addEventListener('click', handleInteraction);
      return () => document.removeEventListener('click', handleInteraction);
    }
  }, [isActive, isInitialized]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!ctx || !isActive) return;

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Get frequency data
      let data: number[];
      if (getFrequencyData) {
        const freqData = getFrequencyData();
        data = Array.from(freqData).slice(0, bars);
      } else if (analyserRef.current && isInitialized) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        data = Array.from(dataArrayRef.current).slice(0, bars);
      } else {
        // Fallback: Generate simulated data
        data = visualizerData.map((value, i) => {
          const baseValue = Math.sin(Date.now() / 200 + i * 0.3) * 0.5 + 0.5;
          const decay = Math.max(0, value - 0.05);
          return Math.max(baseValue * 100 * intensity, decay * 0.9);
        });
        setVisualizerData(data);
      }

      // Normalize data
      const maxValue = Math.max(...data, 1);
      const normalizedData = data.map(value => (value / maxValue) * intensity);

      // Draw based on type
      switch (type) {
        case 'bars':
          drawBars(ctx, normalizedData);
          break;
        case 'circle':
          drawCircle(ctx, normalizedData);
          break;
        case 'wave':
          drawWave(ctx, normalizedData);
          break;
        case 'particles':
          drawParticles(ctx, normalizedData);
          break;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    if (isActive) {
      animationRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, color, intensity, bars, width, height, type, isInitialized, getFrequencyData, visualizerData]);

  const drawBars = (ctx: CanvasRenderingContext2D, data: number[]) => {
    const barWidth = width / bars;
    const spacing = barWidth * 0.2;
    const actualBarWidth = barWidth - spacing;
    
    data.forEach((value, i) => {
      const x = i * barWidth + spacing / 2;
      const barHeight = value * height;
      const y = height - barHeight;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColor(color, -50));
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, actualBarWidth, barHeight);
      
      // Add glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillRect(x, y, actualBarWidth, barHeight);
      ctx.shadowBlur = 0;
    });
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, data: number[]) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;
    
    ctx.beginPath();
    
    data.forEach((value, i) => {
      const angle = (i / bars) * Math.PI * 2;
      const pointRadius = radius + value * radius * 0.5;
      
      const x = centerX + Math.cos(angle) * pointRadius;
      const y = centerY + Math.sin(angle) * pointRadius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.closePath();
    
    // Fill with gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, adjustColor(color, 50));
    gradient.addColorStop(1, adjustColor(color, -50, 0.3));
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add outer line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawWave = (ctx: CanvasRenderingContext2D, data: number[]) => {
    const segmentWidth = width / (bars - 1);
    
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    
    data.forEach((value, i) => {
      const x = i * segmentWidth;
      const y = height / 2 - (value - 0.5) * height * 0.8;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Create smooth curve
        const prevX = (i - 1) * segmentWidth;
        const prevY = height / 2 - (data[i - 1] - 0.5) * height * 0.8;
        const cp1x = prevX + segmentWidth / 2;
        const cp1y = prevY;
        const cp2x = x - segmentWidth / 2;
        const cp2y = y;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      }
    });
    
    // Create gradient for wave
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, adjustColor(color, 30));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, adjustColor(color, -30));
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Fill wave area
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    const fillGradient = ctx.createLinearGradient(0, height / 2, 0, height);
    fillGradient.addColorStop(0, adjustColor(color, 0, 0.3));
    fillGradient.addColorStop(1, adjustColor(color, 0, 0.1));
    
    ctx.fillStyle = fillGradient;
    ctx.fill();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, data: number[]) => {
    data.forEach((value, i) => {
      const x = (i / bars) * width;
      const y = height - value * height;
      const particleSize = value * 10 + 2;
      
      // Create particle gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, particleSize);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColor(color, 0, 0));
      
      ctx.fillStyle = gradient;
      
      // Draw particle with glow
      ctx.shadowColor = color;
      ctx.shadowBlur = particleSize * 2;
      ctx.beginPath();
      ctx.arc(x, y, particleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw connecting lines
      if (i > 0) {
        const prevX = ((i - 1) / bars) * width;
        const prevY = height - data[i - 1] * height;
        
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = adjustColor(color, 0, 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  };

  // Helper to adjust color brightness and opacity
  const adjustColor = (hex: string, percent: number, alpha?: number): string => {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    // Adjust brightness
    r = Math.max(0, Math.min(255, r + (r * percent) / 100));
    g = Math.max(0, Math.min(255, g + (g * percent) / 100));
    b = Math.max(0, Math.min(255, b + (b * percent) / 100));
    
    if (alpha !== undefined) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg"
      />
      
      {/* Audio context warning */}
      {isActive && !isInitialized && !getFrequencyData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <p className="text-xs text-gray-400 text-center px-4">
            Click anywhere to enable audio visualization
          </p>
        </div>
      )}
      
      {/* Fallback animation for inactive state */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent animate-pulse rounded-full" />
        </div>
      )}
    </div>
  );
};

export default Visualizer;