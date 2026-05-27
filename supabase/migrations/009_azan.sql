-- Migration 009: Ezan-Konfiguration pro Screen
-- Jeder Screen kann unabhängig einen Ezan mit eigenen Audio-Dateien konfigurieren.

ALTER TABLE screens ADD COLUMN IF NOT EXISTS azan_config JSONB DEFAULT NULL;

-- Beispiel-Struktur von azan_config:
-- {
--   "enabled": true,
--   "overlay": true,
--   "prayers": {
--     "fajr":    { "url": "https://..." },
--     "dhuhr":   { "url": null },
--     "asr":     { "url": "https://..." },
--     "maghrib": { "url": "https://..." },
--     "isha":    { "url": null }
--   }
-- }
-- url: null → Ezan-Ton ohne Audio (nur Overlay) oder wird übersprungen
