import React, { useState, useRef } from 'react';
import { Upload, X, Music, FileAudio, FileArchive, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { PlanTier } from '../types';
import AudioCutter from './AudioCutter'; // Ensure this path matches your file structure

// Narrow type for file upload slots
type FileTypes = 'cover' | 'preview' | 'mp3' | 'wav' | 'stems';

interface AdminBeatUploadProps {
  onUploadSuccess: () => void;
}

interface BeatFormData {
  title: string;
  producer: string;
  bpm: number;
  key: string;
  genre: string;
  mood: string;
  license_required: PlanTier;
  price: number;
  is_exclusive: boolean;
  duration: number;
}

const AdminBeatUpload: React.FC<AdminBeatUploadProps> = ({ onUploadSuccess }) => {
  const [formData, setFormData] = useState<BeatFormData>({
    title: '',
    producer: 'Curry Stardom',
    bpm: 128,
    key: 'C Major',
    genre: 'Hip Hop',
    mood: 'Aggressive',
    license_required: 'Basic',
    price: 29.99,
    is_exclusive: false,
    duration: 180
  });

  const [files, setFiles] = useState<{
    cover: File | null;
    preview: File | null;
    mp3: File | null;
    wav: File | null;
    stems: File | null;
  }>({
    cover: null,
    preview: null,
    mp3: null,
    wav: null,
    stems: null
  });

  // New State for Audio Cutter
  const [showCutter, setShowCutter] = useState(false);
  const [selectedAudioForPreview, setSelectedAudioForPreview] = useState<File | null>(null);

  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputs = {
    cover: useRef<HTMLInputElement>(null),
    preview: useRef<HTMLInputElement>(null),
    mp3: useRef<HTMLInputElement>(null),
    wav: useRef<HTMLInputElement>(null),
    stems: useRef<HTMLInputElement>(null)
  }; 

  const genres = [
    'Hip Hop', 'Trap', 'R&B', 'Pop', 'Drill', 'Afrobeats',
    'Reggaeton', 'Dancehall', 'Electronic', 'Rock', 'Jazz', 'Lo-fi'
  ];

  const moods = [
    'Aggressive', 'Melancholic', 'Upbeat', 'Dark', 'Chill',
    'Energetic', 'Romantic', 'Mysterious', 'Happy', 'Sad'
  ];

  const keys = [
    'C Major', 'C Minor', 'C# Major', 'C# Minor', 'D Major', 'D Minor',
    'D# Major', 'D# Minor', 'E Major', 'E Minor', 'F Major', 'F Minor',
    'F# Major', 'F# Minor', 'G Major', 'G Minor', 'G# Major', 'G# Minor',
    'A Major', 'A Minor', 'A# Major', 'A# Minor', 'B Major', 'B Minor'
  ];

  const handleFileSelect = (type: keyof typeof files, file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    
    if (file) {
      // Validate file types
      if (type === 'cover') {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          setError(`Invalid file type for cover. Allowed: image/jpeg, image/png, image/webp`);
          setFiles(prev => ({ ...prev, [type]: null }));
          return;
        }
      } else if (type === 'stems') {
        if (!['application/zip', 'application/x-zip-compressed'].includes(file.type) && file.type !== 'application/octet-stream') {
          setError(`Invalid file type for stems. Allowed: .zip`);
          setFiles(prev => ({ ...prev, [type]: null }));
          return;
        }
      } else if (type === 'mp3' || type === 'wav') {
        if (!file.type || !file.type.startsWith('audio/')) {
          setError(`Invalid audio file for ${type}. Upload a music/audio file`);
          setFiles(prev => ({ ...prev, [type]: null }));
          return;
        }
        
        // Set audio for cutting preview logic
        setSelectedAudioForPreview(file);
        // Only open cutter automatically if we don't have a preview yet
        if (!files.preview) {
            setShowCutter(true);
        }
        
        // Auto-detect duration
        const url = URL.createObjectURL(file);
        const audioEl = new Audio(url);
        audioEl.addEventListener('loadedmetadata', () => {
          const d = Math.round(audioEl.duration || 0);
          if (d > 0) setFormData(prev => ({ ...prev, duration: d }));
          URL.revokeObjectURL(url);
        });
      }
  
      if (file.size > 200 * 1024 * 1024) {
        setError(`File too large for ${type}. Maximum size: 200MB`);
        setFiles(prev => ({ ...prev, [type]: null }));
      } else {
        setError(null);
      }
    }
  };

  const handleUpload = async () => {
    console.log('🔄 Upload started:', { 
      cover: !!files.cover, 
      mp3: !!files.mp3,
      preview: !!files.preview,
      title: formData.title 
    });
    
    setIsUploading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress({});

    try {
      // Validate required files
      if (!files.cover || !files.mp3) {
        throw new Error('Cover image and MP3 file are required');
      }
      
      if (!files.preview) {
        throw new Error('Preview file is required. Please cut a preview.');
      }

      if (!formData.title.trim()) {
        throw new Error('Beat title is required');
      }

      // Upload files to storage
      const uploadedFiles: { [key: string]: string } = {};
      const beatId = Date.now().toString();

      // Helper function for uploading
      const uploadFile = async (file: File | Blob, bucket: string, path: string, type: string) => {
        console.log(`📤 Uploading ${type} to ${bucket}/${path}`);
        
        const uploadData = file instanceof File 
          ? file 
          : new File([file], path.split('/').pop() || 'file', { type: (file as Blob).type || 'audio/wav' });

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, uploadData, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error(`Upload error for ${type}:`, error);
          throw new Error(`Failed to upload ${type}: ${error.message}`);
        }
        
        uploadedFiles[type] = path;
        setUploadProgress(prev => ({ ...prev, [type]: 100 }));
        return data;
      };

      // 1. Upload cover image
      setUploadProgress(prev => ({ ...prev, cover: 10 }));
      const coverPath = `covers/${beatId}_${files.cover.name.replace(/\s+/g, '_')}`;
      await uploadFile(files.cover, 'beats', coverPath, 'cover');

      // 2. Upload MP3 file
      setUploadProgress(prev => ({ ...prev, mp3: 30 }));
      const mp3Path = `mp3/${beatId}.mp3`;
      await uploadFile(files.mp3, 'beats', mp3Path, 'mp3');

      // 3. Upload Preview
      setUploadProgress(prev => ({ ...prev, preview: 50 }));
      const previewName = `preview_${beatId}.wav`;
      const previewPath = `previews/${previewName}`;
      await uploadFile(files.preview, 'beat-previews', previewName, 'preview');

      // 4. Upload WAV if provided
      if (files.wav) {
        setUploadProgress(prev => ({ ...prev, wav: 70 }));
        const wavPath = `wav/${beatId}.wav`;
        await uploadFile(files.wav, 'beats', wavPath, 'wav');
      }

      // 5. Upload stems if provided
      if (files.stems) {
        setUploadProgress(prev => ({ ...prev, stems: 90 }));
        const stemsPath = `stems/${beatId}.zip`;
        await uploadFile(files.stems, 'beats', stemsPath, 'stems');
      }

      // 6. Create beat record in database
      console.log('💾 Creating database record...');
      const { error: dbError } = await supabase
        .from('beats')
        .insert({
          title: formData.title,
          producer: formData.producer,
          bpm: formData.bpm,
          key: formData.key,
          genre: formData.genre,
          mood: formData.mood,
          cover_url: coverPath,
          preview_path: previewPath,
          mp3_path: mp3Path,
          wav_path: uploadedFiles.wav || null,
          stems_path: uploadedFiles.stems || null,
          is_exclusive: formData.is_exclusive,
          license_required: formData.license_required,
          price: formData.price,
          duration: formData.duration,
          download_count: { mp3: 0, wav: 0, stems: 0 },
          created_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Success
      console.log('✅ Beat uploaded successfully!');
      setSuccess(true);
      onUploadSuccess();
      
      // Reset form after 2 seconds
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (err: any) {
      console.error('❌ Upload failed:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      producer: 'Curry Stardom',
      bpm: 128,
      key: 'C Major',
      genre: 'Hip Hop',
      mood: 'Aggressive',
      license_required: 'Basic',
      price: 29.99,
      is_exclusive: false,
      duration: 180
    });
    setFiles({
      cover: null,
      preview: null,
      mp3: null,
      wav: null,
      stems: null
    });
    setShowCutter(false);
    setSelectedAudioForPreview(null);
    setUploadProgress({});
    setSuccess(false);
  };

  return (
    <div className="p-6">
      <h3 className="text-2xl font-bold mb-6">Upload New Beat</h3>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-400 font-medium">
              Beat uploaded successfully!
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-bold mb-4">Basic Information</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Beat Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500"
                  placeholder="e.g., Midnight Dreams"
                  disabled={isUploading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">BPM</label>
                  <input
                    type="number"
                    value={formData.bpm}
                    onChange={(e) => setFormData(prev => ({ ...prev, bpm: parseInt(e.target.value) || 128 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500"
                    min="60"
                    max="220"
                    disabled={isUploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 180 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500"
                    min="30"
                    max="600"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Genre *</label>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                    className="w-full bg-[#0b0b0b] text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500"
                    disabled={isUploading}
                  >
                    {genres.map(genre => (
                      <option key={genre} className="bg-[#0b0b0b] text-white" value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Key *</label>
                  <select
                    value={formData.key}
                    onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                    className="w-full bg-[#0b0b0b] text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500"
                    disabled={isUploading}
                  >
                    {keys.map(key => (
                      <option key={key} className="bg-[#0b0b0b] text-white" value={key}>{key}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Mood</label>
                <select
                  value={formData.mood}
                  onChange={(e) => setFormData(prev => ({ ...prev, mood: e.target.value }))}
                  className="w-full bg-[#0b0b0b] text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500"
                  disabled={isUploading}
                >
                  {moods.map(mood => (
                    <option key={mood} className="bg-[#0b0b0b] text-white" value={mood}>{mood}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Licensing & Pricing */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-bold mb-4">Licensing & Pricing</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Minimum License Required</label>
                <select
                  value={formData.license_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, license_required: e.target.value as PlanTier }))}
                  className="w-full bg-[#0b0b0b] text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500"
                  disabled={isUploading}
                >
                  <option className="bg-[#0b0b0b] text-white" value="Basic">Basic (MP3 only)</option>
                  <option className="bg-[#0b0b0b] text-white" value="Pro">Pro (MP3 + WAV)</option>
                  <option className="bg-[#0b0b0b] text-white" value="Exclusive">Exclusive (All formats)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 29.99 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500"
                    disabled={isUploading}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_exclusive"
                    checked={formData.is_exclusive}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_exclusive: e.target.checked }))}
                    className="w-5 h-5 accent-yellow-500"
                    disabled={isUploading}
                  />
                  <label htmlFor="is_exclusive" className="text-sm font-bold">
                    Mark as Exclusive Beat
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - File Uploads */}
        <div className="space-y-6">
          {/* Cover Image */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-bold mb-4">Cover Image *</h4>
            <div className="space-y-4">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                files.cover ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-white/20'
              }`}>
                <input
                  type="file"
                  ref={fileInputs.cover}
                  onChange={(e) => handleFileSelect('cover', e.target.files?.[0] || null)}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploading}
                />
                
                {files.cover ? (
                  <div className="space-y-3">
                    <ImageIcon className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <p className="font-bold">{files.cover.name}</p>
                      <p className="text-sm text-gray-500">
                        {(files.cover.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => fileInputs.cover.current?.click()}
                        className="text-sm text-yellow-500 hover:text-yellow-400"
                        disabled={isUploading}
                      >
                        Change
                      </button>
                      <button
                        onClick={() => handleFileSelect('cover', null)}
                        className="text-sm text-red-500 hover:text-red-400"
                        disabled={isUploading}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputs.cover.current?.click()}
                    className="w-full space-y-3"
                    disabled={isUploading}
                  >
                    <ImageIcon className="w-12 h-12 text-gray-500 mx-auto" />
                    <div>
                      <p className="font-bold">Upload Cover Image</p>
                      <p className="text-sm text-gray-500">JPEG, PNG, WebP • Max 5MB</p>
                    </div>
                  </button>
                )}

                {uploadProgress.cover !== undefined && (
                  <div className="mt-4">
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${uploadProgress.cover}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audio Files */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-bold mb-4">Audio Files</h4>
            <div className="space-y-4">
              
              {/* Preview Audio Section */}
              <div className={`border rounded-xl p-4 ${files.preview ? 'border-green-500/50 bg-green-500/5' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-5 h-5" />
                    <span className="font-bold">Preview Audio *</span>
                  </div>
                  {files.preview ? (
                    <span className="text-xs text-green-500">Ready (30s cut)</span>
                  ) : selectedAudioForPreview ? (
                    <button
                      onClick={() => setShowCutter(true)}
                      className="text-xs text-yellow-500 hover:text-yellow-400 font-bold"
                      type="button"
                    >
                      Click to cut 30s
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Upload MP3/WAV first</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Cut 30-second preview from uploaded audio. Required for marketplace.
                </p>
                
                {files.preview && (
                  <div className="mb-3 p-2 bg-green-500/10 rounded-lg">
                    <p className="text-xs text-green-400 font-medium">✓ Preview created</p>
                    <p className="text-xs text-green-400">
                      Size: {(files.preview.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
                
                <FileUploadButton
                  type="preview"
                  file={files.preview}
                  fileInput={fileInputs.preview}
                  onSelect={handleFileSelect}
                  accept="audio/*"
                  disabled={isUploading}
                />
              </div>

              {/* MP3 File (Required) */}
              <div className={`border rounded-xl p-4 ${files.mp3 ? 'border-green-500/50 bg-green-500/5' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    <span className="font-bold">MP3 File *</span>
                  </div>
                  {files.mp3 && (
                    <span className="text-xs text-green-500">Ready</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">Full track in MP3 format</p>
                <FileUploadButton
                  type="mp3"
                  file={files.mp3}
                  fileInput={fileInputs.mp3}
                  onSelect={handleFileSelect}
                  accept="audio/*"
                  disabled={isUploading}
                />
              </div>

              {/* WAV File (Optional) */}
              <div className={`border rounded-xl p-4 ${files.wav ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-5 h-5 text-blue-500" />
                    <span className="font-bold">WAV File (Optional)</span>
                  </div>
                  {files.wav && (
                    <span className="text-xs text-blue-500">Ready</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">High-quality WAV for Pro users</p>
                <FileUploadButton
                  type="wav"
                  file={files.wav}
                  fileInput={fileInputs.wav}
                  onSelect={handleFileSelect}
                  accept="audio/*"
                  disabled={isUploading}
                />
              </div>

              {/* Stems (Optional) */}
              <div className={`border rounded-xl p-4 ${files.stems ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileArchive className="w-5 h-5 text-purple-500" />
                    <span className="font-bold">Stems (Optional)</span>
                  </div>
                  {files.stems && (
                    <span className="text-xs text-purple-500">Ready</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">Individual tracks in ZIP format</p>
                <FileUploadButton
                  type="stems"
                  file={files.stems}
                  fileInput={fileInputs.stems}
                  onSelect={handleFileSelect}
                  accept=".zip,application/zip"
                  disabled={isUploading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Cutter Modal */}
      {showCutter && selectedAudioForPreview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setShowCutter(false)}
              className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <AudioCutter
              audioFile={selectedAudioForPreview}
              duration={30}
              onCut={(blob) => {
                // Create preview file from the cut blob
                const previewFile = new File([blob], `preview_${Date.now()}.wav`, {
                  type: 'audio/wav'
                });
                
                // Set it as the preview file
                setFiles(prev => ({ ...prev, preview: previewFile }));
                setShowCutter(false);
                
                // Show success message
                setError(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          * Required fields
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={resetForm}
            disabled={isUploading}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !files.cover || !files.mp3 || !files.preview || !formData.title.trim()}
            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-yellow-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Beat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component for file upload buttons
const FileUploadButton: React.FC<{
  type: FileTypes;
  file: File | null;
  fileInput: React.RefObject<HTMLInputElement>;
  onSelect: (type: FileTypes, file: File | null) => void;
  accept: string;
  disabled: boolean;
}> = ({ type, file, fileInput, onSelect, accept, disabled }) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => fileInput.current?.click()}
      className="px-4 py-2 bg-white/5 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
      disabled={disabled}
    >
      {file ? 'Change File' : 'Select File'}
    </button>
    <input
      type="file"
      ref={fileInput}
      onChange={(e) => onSelect(type, e.target.files?.[0] || null)}
      accept={accept}
      className="hidden"
      disabled={disabled}
    />
    {file && (
      <>
        <span className="text-sm text-gray-400 flex-1 truncate">{file.name}</span>
        <button
          onClick={() => onSelect(type, null)}
          className="p-1 hover:bg-white/10 rounded"
          disabled={disabled}
        >
          <X className="w-4 h-4 text-red-500" />
        </button>
      </>
    )}
  </div>
);

export default AdminBeatUpload;