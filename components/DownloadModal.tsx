import React, { useState, useEffect } from 'react';
import { X, Download, Music, FileAudio, Layers, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Beat, PlanTier, DownloadFormat } from '../types';
import { downloadService } from '../services/downloadService';
import { downloadFile, getPublicUrl } from '../services/beatService';
import { supabase } from '../supabase';

interface DownloadModalProps {
  beat: Beat;
  isOpen: boolean;
  onClose: () => void;
  onDownloadSuccess: (format: DownloadFormat) => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ beat, isOpen, onClose, onDownloadSuccess }) => {
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanTier>('Basic');
  const [permission, setPermission] = useState<{ allowed: boolean; reason: string; remaining: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
      setSelectedFormat(null);
      setError(null);
      setSuccess(false);
      setDownloadProgress(0);
    }
  }, [isOpen, beat]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_tier')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserPlan(profile.plan_tier);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkPermission = async (format: DownloadFormat) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermission({
          allowed: false,
          reason: 'Please sign in to download beats',
          remaining: 0
        });
        return false;
      }

      const result = await downloadService.canUserDownload(user.id, format, beat.license_required);
      setPermission(result);
      return result.allowed;
    } catch (error) {
      console.error('Permission check error:', error);
      setPermission({
        allowed: false,
        reason: 'Error checking download permissions',
        remaining: 0
      });
      return false;
    }
  };

  const handleFormatSelect = async (format: DownloadFormat) => {
    setError(null);
    const allowed = await checkPermission(format);
    
    if (allowed) {
      setSelectedFormat(format);
    } else {
      setSelectedFormat(null);
    }
  };

  const handleDownload = async () => {
    if (!selectedFormat) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsDownloading(true);
    setError(null);
    setDownloadProgress(0);

    try {
      // Record download in database
      const recorded = await downloadService.recordDownload(user.id, beat.id, selectedFormat);
      if (!recorded) {
        throw new Error('Failed to record download');
      }

      // Get download URL based on format
      let downloadUrl = '';
      let filename = `${beat.title.replace(/[^a-z0-9]/gi, '_')}_${beat.producer.replace(/[^a-z0-9]/gi, '_')}`;

      switch (selectedFormat) {
        case 'mp3':
          downloadUrl = beat.mp3Url || getPublicUrl('beats', `mp3/${beat.id}.mp3`);
          filename += '.mp3';
          break;
        case 'wav':
          downloadUrl = beat.wavUrl || getPublicUrl('beats', `wav/${beat.id}.wav`);
          filename += '.wav';
          break;
        case 'stems':
          downloadUrl = beat.stemsUrl || getPublicUrl('beats', `stems/${beat.id}.zip`);
          filename += '_stems.zip';
          break;
      }

      if (!downloadUrl) {
        throw new Error('Download URL not available');
      }

      // Start file download
      await downloadFile(
        downloadUrl,
        filename,
        (progress) => setDownloadProgress(progress)
      );

      // Success
      setSuccess(true);
      onDownloadSuccess(selectedFormat);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.message || 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const formatDetails = {
    mp3: {
      icon: <Music className="w-6 h-6" />,
      title: 'MP3',
      description: 'Compressed format, perfect for quick previews and sharing',
      size: '~5-10 MB',
      plans: ['Basic', 'Pro', 'Exclusive']
    },
    wav: {
      icon: <FileAudio className="w-6 h-6" />,
      title: 'WAV',
      description: 'Studio quality, lossless audio for professional production',
      size: '~50-100 MB',
      plans: ['Pro', 'Exclusive']
    },
    stems: {
      icon: <Layers className="w-6 h-6" />,
      title: 'Stems',
      description: 'Individual track components for complete creative control',
      size: '~200-500 MB',
      plans: ['Exclusive']
    }
  };

  const formatRequirement = (format: DownloadFormat): string => {
    const requiredPlan = format === 'mp3' ? 'Basic' : format === 'wav' ? 'Pro' : 'Exclusive';
    return `${requiredPlan} Plan required`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[2000] flex items-center justify-center p-4">
      <div className="glass rounded-3xl max-w-md w-full relative overflow-hidden">
        <button
          onClick={onClose}
          disabled={isDownloading}
          className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-lg transition-colors z-10 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-black" />
            </div>
            <h2 className="text-2xl font-black mb-2">Download "{beat.title}"</h2>
            <p className="text-gray-500">Choose your preferred format</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-bold">
                {beat.genre}
              </span>
              <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold">
                {beat.bpm} BPM
              </span>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-4 mb-8">
            {(Object.keys(formatDetails) as DownloadFormat[]).map((format) => {
              const details = formatDetails[format];
              const isAvailable = details.plans.includes(userPlan) && 
                ['Basic', 'Pro', 'Exclusive'].indexOf(userPlan) >= 
                ['Basic', 'Pro', 'Exclusive'].indexOf(beat.license_required);
              const isSelected = selectedFormat === format;

              return (
                <button
                  key={format}
                  onClick={() => isAvailable && handleFormatSelect(format)}
                  disabled={!isAvailable || isDownloading}
                  className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                    isSelected
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-white/10 hover:border-white/20'
                  } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isAvailable ? 'bg-white/10' : 'bg-white/5'
                    }`}>
                      {details.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-lg">{details.title}</h3>
                        <span className="text-xs text-gray-500 font-mono">{details.size}</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{details.description}</p>
                      <div className="flex items-center gap-2">
                        {isAvailable ? (
                          <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">
                            Available
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                            {formatRequirement(format)}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Permission Warning */}
          {permission && !permission.allowed && selectedFormat && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400 font-medium">{permission.reason}</p>
                  {permission.remaining === 0 && userPlan === 'Basic' && (
                    <p className="text-xs text-red-400 mt-1">
                      Upgrade to Pro for unlimited downloads
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Download Stats */}
          {permission?.allowed && selectedFormat && (
            <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-green-400 font-medium">Download available</p>
                    <p className="text-xs text-green-500">
                      {permission.remaining === Infinity ? 'Unlimited' : `${permission.remaining} downloads remaining this month`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-400 font-medium">
                  Download complete! The file should start downloading automatically.
                </p>
              </div>
            </div>
          )}

          {/* Download Progress */}
          {isDownloading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Downloading...</span>
                <span className="text-sm font-bold text-yellow-500">{Math.round(downloadProgress)}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={!selectedFormat || !permission?.allowed || isDownloading || success}
              className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-yellow-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Downloading...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Success!
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download {selectedFormat ? selectedFormat.toUpperCase() : ''}
                </>
              )}
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              Downloads are for personal use only. Commercial rights require appropriate licensing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;