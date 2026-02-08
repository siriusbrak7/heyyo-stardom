import { supabase } from '../supabase'; // Ensure this points to your actual supabase client

export class AudioService {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private currentUrl: string = '';
  private volume: number = 0.8;
  private playbackRate: number = 1.0;
  private isLoading: boolean = false;
  private error: string | null = null;
  
  // Event listeners to keep bound for cleanup
  private onPlay = () => { this.isPlaying = true; };
  private onPause = () => { this.isPlaying = false; };
  private onEnded = () => { this.isPlaying = false; };
  private onError = (e: Event) => {
    console.error('Audio element error:', e);
    this.error = 'Failed to play audio';
    this.isLoading = false;
    this.isPlaying = false;
  };

  constructor() {
    this.audioElement = new Audio();
    this.attachListeners();
    this.audioElement.volume = this.volume;
    this.audioElement.playbackRate = this.playbackRate;
  }

  private attachListeners() {
    if (!this.audioElement) return;
    this.audioElement.addEventListener('play', this.onPlay);
    this.audioElement.addEventListener('pause', this.onPause);
    this.audioElement.addEventListener('ended', this.onEnded);
    this.audioElement.addEventListener('error', this.onError);
  }

  async loadAudio(url: string, retryCount = 2): Promise<boolean> {
    if (!this.audioElement) return false;
    
    // If it's the same URL and already loaded, just ensure it's ready
    if (this.currentUrl === url && this.audioElement.src) {
      return true;
    }
    
    // Stop any current playback before loading new
    this.stop();
    
    this.currentUrl = url;
    this.isLoading = true;
    this.error = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retrying audio load (attempt ${attempt + 1}/${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        // Optional: Check if file exists via HEAD request (skipping for Blob URLs)
        if (!url.startsWith('blob:')) {
            try {
                const testResponse = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
                if (!testResponse.ok) {
                    if (attempt === retryCount) {
                        this.error = 'Audio file not accessible';
                        continue; // try loop logic or exit
                    }
                    continue;
                }
            } catch (err) {
                // If CORS blocks HEAD, proceed to try loading it directly
                console.warn('HEAD check failed, trying direct load', err);
            }
        }
        
        this.audioElement.src = url;
        this.audioElement.preload = 'metadata';
        
        await new Promise((resolve, reject) => {
          if (!this.audioElement) return reject();
          
          const onLoaded = () => {
            cleanup();
            resolve(true);
          };
          
          const onError = () => {
            cleanup();
            reject(new Error('Failed to load audio metadata'));
          };
          
          const cleanup = () => {
            this.audioElement?.removeEventListener('loadedmetadata', onLoaded);
            this.audioElement?.removeEventListener('error', onError);
          };
          
          this.audioElement.addEventListener('loadedmetadata', onLoaded, { once: true });
          this.audioElement.addEventListener('error', onError, { once: true });
          
          // Shorter timeout for better UX
          setTimeout(() => {
            cleanup();
            reject(new Error('Audio load timeout'));
          }, 15000);
        });
        
        this.isLoading = false;
        return true;
      } catch (error) {
        console.warn(`Audio load attempt ${attempt + 1} failed:`, error);
        
        if (attempt === retryCount) {
          this.error = 'Failed to load audio after multiple attempts';
          this.isLoading = false;
          return false;
        }
      }
    }
    
    this.isLoading = false;
    return false;
  }

  play(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.audioElement || !this.audioElement.src) {
        reject(new Error('No audio loaded'));
        return;
      }
      
      try {
        await this.audioElement.play();
        resolve();
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          this.error = 'User interaction required to play audio';
          
          const enableAudio = () => {
            document.removeEventListener('click', enableAudio);
            this.audioElement?.play().then(resolve).catch(reject);
          };
          
          document.addEventListener('click', enableAudio, { once: true });
        } else if (error.name === 'AbortError') {
          // Ignore abort errors (usually happens if user clicks play/pause quickly)
          this.error = 'Audio playback was aborted';
          resolve(); 
        } else {
          this.error = 'Failed to play audio';
          reject(error);
        }
      }
    });
  }

  pause(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
  }

  stop(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.isPlaying = false;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.25, Math.min(4.0, rate));
    if (this.audioElement) {
      this.audioElement.playbackRate = this.playbackRate;
    }
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  getError(): string | null {
    return this.error;
  }

  seekTo(time: number): void {
    if (!this.audioElement || time < 0) return;
    const duration = this.getDuration();
    if (duration > 0) {
        this.audioElement.currentTime = Math.min(time, duration);
    }
  }

  togglePlay(): Promise<void> {
    if (this.isPlaying) {
      this.pause();
      return Promise.resolve();
    } else {
      return this.play();
    }
  }

  toggleMute(): void {
    if (this.audioElement) {
      this.audioElement.muted = !this.audioElement.muted;
    }
  }

  isMuted(): boolean {
    return this.audioElement?.muted || false;
  }

  cleanup(): void {
    this.stop();
    if (this.audioElement) {
      this.audioElement.removeEventListener('play', this.onPlay);
      this.audioElement.removeEventListener('pause', this.onPause);
      this.audioElement.removeEventListener('ended', this.onEnded);
      this.audioElement.removeEventListener('error', this.onError);
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this.isPlaying = false;
    this.currentUrl = '';
    this.isLoading = false;
    this.error = null;
  }

  // Audio visualization helper
  async getAudioContext(): Promise<AudioContext | null> {
    if (!this.audioElement || !this.audioElement.src) return null;
    
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Note: connecting MediaElementSource requires the element to strictly handle CORS if remote
      // if (this.audioElement) {
      //   this.audioElement.crossOrigin = "anonymous";
      // }

      return this.audioContext;
    } catch (error) {
      console.error('Failed to create audio context:', error);
      return null;
    }
  }

  // Format time helper
  static formatTime(time: number): string {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Check if audio format is supported
  static isFormatSupported(url: string): boolean {
    const audio = document.createElement('audio');
    const extension = url.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'mp3':
        return audio.canPlayType('audio/mpeg') !== '';
      case 'wav':
        return audio.canPlayType('audio/wav') !== '';
      case 'ogg':
        return audio.canPlayType('audio/ogg') !== '';
      case 'm4a':
        return audio.canPlayType('audio/mp4') !== '';
      default:
        return true;
    }
  }
}

// Create and export the singleton instance
export const audioService = new AudioService();

// --- Integration Helpers using the Service ---

export const playAudioFromSupabase = async (filePath: string, bucket = 'beats') => {
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    if (!data?.publicUrl) {
      throw new Error('Audio file not found');
    }
    
    // Use the singleton service instead of creating a new Audio() instance
    // This ensures previous tracks stop playing automatically.
    const success = await audioService.loadAudio(data.publicUrl);
    
    if (success) {
      return audioService.play();
    } else {
      throw new Error(audioService.getError() || 'Failed to load audio');
    }
  } catch (error) {
    console.error('Playback error:', error);
    throw error;
  }
};

// For previews (in beat-previews bucket)
export const playPreview = async (previewPath: string) => {
  // beat-previews bucket is public, so getPublicUrl works
  return playAudioFromSupabase(previewPath, 'beat-previews');
};