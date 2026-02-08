Server-side preview generation

This repository contains a Node helper script and a server API to generate 30-second MP3 previews using ffmpeg and upload them to Supabase Storage (the `beat-previews` bucket).

Files added:
- `scripts/generate_preview.js` - Local CLI script that creates a signed URL for a source object, downloads it, trims to 30s with `ffmpeg`, and uploads the result.
- `api/generate-preview.ts` - Serverless API endpoint that does the same on the server side. The endpoint requires `ffmpeg` to be installed on the host and the `SUPABASE_SERVICE_ROLE_KEY` env var.

Local usage:
1. Install `ffmpeg` on your system.
2. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in your environment.
3. Run:
   `node scripts/generate_preview.js --bucket beats --path "mp3/<your_file>.mp3" --dest "previews/preview_<id>.mp3"`

Server usage (API):
- POST to `/api/generate-preview` with JSON body: `{ "sourceBucket": "beats", "sourcePath": "mp3/<file>.mp3", "destBucket": "beat-previews", "destPath": "previews/preview_<id>.mp3" }`.

Security note:
- The script and the API use the Supabase Service Role key for server-side access. Protect this key: do not expose it to clients, and only run the API in trusted server environments.
