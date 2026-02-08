CREATE OR REPLACE FUNCTION increment_download(beat_id UUID, format_name TEXT)
RETURNS void AS $$
BEGIN
  UPDATE beats 
  SET download_count = jsonb_set(
    COALESCE(download_count, '{"mp3":0,"wav":0,"stems":0}'::jsonb),
    ARRAY[format_name],
    (COALESCE((download_count->>format_name)::int, 0) + 1)::text::jsonb
  )
  WHERE id = beat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
