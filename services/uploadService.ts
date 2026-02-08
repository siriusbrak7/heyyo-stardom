import { supabase } from "../supabase";

export interface UploadProgress {
  loaded: number;
  total: number;
}

export const uploadBeatFile = async (
  file: File,
  bucket: string,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      onUploadProgress: (progress) => {
        if (onProgress) {
          onProgress({
            loaded: progress.loaded,
            total: progress.total || file.size
          });
        }
      }
    });

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
    
  return publicUrl;
};

export const createBeatRecord = async (beatData: {
  title: string;
  producer: string;
  bpm: number;
  key: string;
  genre: string;
  mood: string;
  cover_url: string;
  preview_path: string;
  mp3_path: string;
  wav_path?: string;
  stems_path?: string;
  license_required: "Basic" | "Pro" | "Exclusive";
  is_exclusive: boolean;
}) => {
  const { data, error } = await supabase
    .from("beats")
    .insert([beatData])
    .select()
    .single();

  if (error) throw error;
  return data;
};