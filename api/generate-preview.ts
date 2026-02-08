import { createClient } from '@supabase/supabase-js';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response('Server misconfigured', { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return new Response('Bad request', { status: 400 });

  const { sourceBucket, sourcePath, destBucket = 'beat-previews', destPath } = body;

  if (!sourceBucket || !sourcePath) return new Response('Missing sourceBucket or sourcePath', { status: 400 });

  // Ensure ffmpeg is available
  const ffCheck = spawnSync('ffmpeg', ['-version']);
  if (ffCheck.error) {
    console.error('ffmpeg not found on PATH');
    return new Response('ffmpeg not available on server', { status: 501 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Create signed URL for the source file (short lived)
    const { data: signed, error: signedErr } = await supabase.storage.from(sourceBucket).createSignedUrl(sourcePath, 60);
    if (signedErr || !signed?.signedUrl) {
      console.error('Failed to create signed URL:', signedErr);
      return new Response('Could not access source object', { status: 500 });
    }

    // Download source file
    const res = await fetch(signed.signedUrl);
    if (!res.ok) {
      console.error('Failed to download source file');
      return new Response('Failed to download source', { status: 500 });
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-'));
    const ext = path.extname(sourcePath) || '.mp3';
    const inputPath = path.join(tmpDir, `input${ext}`);
    const outputPath = path.join(tmpDir, 'preview.mp3');

    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    // Run ffmpeg to create 30s MP3 preview
    const ff = spawnSync('ffmpeg', ['-y', '-i', inputPath, '-ss', '0', '-t', '30', '-vn', '-acodec', 'libmp3lame', '-b:a', '192k', outputPath], { stdio: 'inherit' });
    if (ff.error || ff.status !== 0) {
      console.error('ffmpeg failed:', ff.error || ff.status);
      return new Response('ffmpeg processing failed', { status: 500 });
    }

    const finalDestPath = destPath || `previews/preview_${Date.now()}.mp3`;

    // Upload to Supabase
    const fileStream = fs.createReadStream(outputPath);
    const { data: uploadData, error: uploadError } = await supabase.storage.from(destBucket).upload(finalDestPath, fileStream, { upsert: true });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response('Failed to upload preview', { status: 500 });
    }

    const { data: public } = supabase.storage.from(destBucket).getPublicUrl(finalDestPath);

    // Cleanup
    try { fs.rmSync(tmpDir, { recursive: true }); } catch (e) { /* ignore */ }

    return new Response(JSON.stringify({ publicUrl: public?.publicUrl, path: finalDestPath }), { status: 200 });
  } catch (error) {
    console.error('Error generating preview:', error);
    return new Response('Error generating preview', { status: 500 });
  }
}
