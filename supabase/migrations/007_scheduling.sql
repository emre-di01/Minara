-- Zeitplanung pro Screen (Zeitfenster → Playlist)
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::jsonb;

-- Übergangsanimation pro Playlist
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS transition TEXT DEFAULT 'fade';
