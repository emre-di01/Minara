-- Allow audio MIME types in media bucket (needed for Ezan/Azan uploads)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg','image/png','image/webp','image/gif',
  'video/mp4','video/webm',
  'audio/mpeg','audio/mp3','audio/aac','audio/ogg','audio/wav',
  'audio/x-wav','audio/mp4','audio/x-m4a','audio/opus','audio/flac',
  'audio/*'
]
WHERE id = 'media';
