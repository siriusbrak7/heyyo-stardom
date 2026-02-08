#!/usr/bin/env node
/*
 Simple Node script to generate a 30-second MP3 preview using ffmpeg and upload it to Supabase storage.
 Usage:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate_preview.js --bucket beats --path mp3/123.mp3 --dest previews/preview_123.mp3

 Requirements:
 - ffmpeg installed and available on PATH
 - Node 18+ (fetch is available globally)
 - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in env
*/

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

(async function main() {
  const args = parseArgs();
  const sourceBucket = args.bucket;
  const sourcePath = args.path;
  const destBucket = args.destBucket || 'beat-previews';
  const destPath = args.dest || `previews/preview_${Date.now()}.mp3`;

  if (!sourceBucket || !sourcePath) {
    console.error('ERROR: --bucket and --path are required');
    process.exit(2);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env');
    process.exit(2);
  }

  // Ensure ffmpeg present
  const ffCheck = spawnSync('ffmpeg', ['-version']);
  if (ffCheck.error) {
    console.error('ERROR: ffmpeg not found on PATH. Install ffmpeg first (brew/apt/winget/choco)');
    process.exit(2);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('Creating signed URL for source file...');
    const { data: signed, error: signedErr } = await supabase.storage.from(sourceBucket).createSignedUrl(sourcePath, 60);
    if (signedErr || !signed?.signedUrl) throw signedErr || new Error('Failed to create signed URL');

    const response = await fetch(signed.signedUrl);
    if (!response.ok) throw new Error(`Failed to fetch source file: ${response.status}`);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-'));
    const ext = path.extname(sourcePath) || '.mp3';
    const inputPath = path.join(tmpDir, `input${ext}`);
    const outputPath = path.join(tmpDir, 'preview.mp3');

    const arr = new Uint8Array(await response.arrayBuffer());
    fs.writeFileSync(inputPath, Buffer.from(arr));

    console.log('Running ffmpeg to create 30s preview...');

    const ff = spawnSync('ffmpeg', ['-y', '-i', inputPath, '-ss', '0', '-t', '30', '-vn', '-acodec', 'libmp3lame', '-b:a', '192k', outputPath], { stdio: 'inherit' });
    if (ff.error || ff.status !== 0) {
      throw ff.error || new Error(`ffmpeg exited with ${ff.status}`);
    }

    console.log('Uploading preview to Supabase storage...');
    const fileStream = fs.createReadStream(outputPath);
    const { data: uploadData, error: uploadError } = await supabase.storage.from(destBucket).upload(destPath, fileStream, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from(destBucket).getPublicUrl(destPath);

    console.log('Preview uploaded successfully!');
    console.log('Public URL:', publicData.publicUrl);

    // Cleanup temp files
    try { fs.rmSync(tmpDir, { recursive: true }); } catch (e) { /* ignore */ }

    process.exit(0);
  } catch (error) {
    console.error('Error generating preview:', error);
    process.exit(1);
  }
})();
