import { supabase } from "../supabase";
import { Beat, DownloadFormat } from "../types";

export const fetchBeats = async (): Promise<Beat[]> => {
  try {
    const { data, error } = await supabase
      .from('beats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching beats:', error.message);
      throw error;
    }

    return data.map(beat => ({
      id: beat.id,
      title: beat.title,
      producer: beat.producer || 'Curry Stardom',
      bpm: beat.bpm,
      key: beat.key,
      genre: beat.genre,
      mood: beat.mood,
      coverUrl: beat.cover_url,
      audioUrl: beat.preview_path,
      mp3Url: beat.mp3_path,
      wavUrl: beat.wav_path,
      stemsUrl: beat.stems_path,
      is_exclusive: beat.is_exclusive,
      license_required: beat.license_required,
      download_count: beat.download_count || { mp3: 0, wav: 0, stems: 0 },
      created_at: beat.created_at,
      price: beat.price,
      duration: beat.duration
    }));
  } catch (error) {
    console.error('Exception fetching beats:', error);
    throw error;
  }
};

export const fetchBeatById = async (beatId: string): Promise<Beat | null> => {
  try {
    const { data, error } = await supabase
      .from('beats')
      .select('*')
      .eq('id', beatId)
      .single();

    if (error) {
      console.error('Error fetching beat:', error.message);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      producer: data.producer || 'Curry Stardom',
      bpm: data.bpm,
      key: data.key,
      genre: data.genre,
      mood: data.mood,
      coverUrl: data.cover_url,
      audioUrl: data.preview_path,
      mp3Url: data.mp3_path,
      wavUrl: data.wav_path,
      stemsUrl: data.stems_path,
      is_exclusive: data.is_exclusive,
      license_required: data.license_required,
      download_count: data.download_count || { mp3: 0, wav: 0, stems: 0 },
      created_at: data.created_at,
      price: data.price,
      duration: data.duration
    };
  } catch (error) {
    console.error('Exception fetching beat:', error);
    return null;
  }
};

export const recordDownload = async (
  beatId: string, 
  userId: string, 
  format: DownloadFormat
): Promise<boolean> => {
  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      // Record download
      const { error: downloadError } = await supabase
        .from("downloads")
        .insert([{ 
          beat_id: beatId, 
          user_id: userId, 
          format,
          created_at: new Date().toISOString()
        }]);

      if (downloadError) {
        console.error("Error recording download:", downloadError.message);
        attempts++;
        if (attempts === maxRetries) return false;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        continue;
      }

      // Update download count
      const { error: updateError } = await supabase.rpc("increment_download", {
        beat_id: beatId,
        format_name: format
      });

      if (updateError) {
        console.error("Error updating download count:", updateError.message);
        // Continue anyway - download was recorded
      }

      return true;
    } catch (error) {
      console.error("Exception recording download:", error);
      attempts++;
      if (attempts === maxRetries) return false;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }
  
  return false;
};

export const getPublicUrl = (bucket: string, path: string): string => {
  // Map bucket names
  const bucketMap: Record<string, string> = {
    'beats': 'beat-mp3s', // Default to mp3s
    'previews': 'beat-previews',
    'stems': 'beat-stems'
  };
  
  const actualBucket = bucketMap[bucket] || bucket;
  
  try {
    const { data } = supabase.storage
      .from(actualBucket)
      .getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return '';
  }
};

export const downloadFile = async (
  url: string, 
  filename: string,
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;
      
      if (onProgress && total > 0) {
        const progress = (loaded / total) * 100;
        onProgress(Math.min(progress, 100));
      }
    }

    const blob = new Blob(chunks);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return true;
  } catch (error) {
    console.error("Download failed:", error);
    
    // Fallback: Direct link for large files
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.log('Using direct download fallback');
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    throw error;
  }
};

export const searchBeats = async (query: string): Promise<Beat[]> => {
  try {
    const { data, error } = await supabase
      .from('beats')
      .select('*')
      .or(`title.ilike.%${query}%,producer.ilike.%${query}%,genre.ilike.%${query}%,mood.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching beats:', error.message);
      return [];
    }

    return data.map(beat => ({
      id: beat.id,
      title: beat.title,
      producer: beat.producer || 'Curry Stardom',
      bpm: beat.bpm,
      key: beat.key,
      genre: beat.genre,
      mood: beat.mood,
      coverUrl: beat.cover_url,
      audioUrl: beat.preview_path,
      mp3Url: beat.mp3_path,
      wavUrl: beat.wav_path,
      stemsUrl: beat.stems_path,
      is_exclusive: beat.is_exclusive,
      license_required: beat.license_required,
      download_count: beat.download_count || { mp3: 0, wav: 0, stems: 0 }
    }));
  } catch (error) {
    console.error('Exception searching beats:', error);
    return [];
  }
};