# Mosque Signage

Digital-Signage-Plattform für Moscheen — Echtzeit-Playlist-Steuerung, Gebetszeiten, mehrsprachig.

## Stack

| Schicht | Technologie |
|---------|------------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Backend | Supabase (Postgres, Realtime, Auth, Storage) |
| Gebetszeiten | AwqatSalah (C# Microservice via Diyanet API) **oder** adhan.js (Berechnung via GPS) |
| Bildgenerierung | Replicate FLUX.1 (Supabase Deno Edge Function) |

---

## Projektstruktur

```
mosque-signage/
├── app/
│   └── src/
│       ├── cms/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx        – Übersicht (Screens + Playlists)
│       │   │   ├── Login.tsx            – E-Mail/Passwort Auth
│       │   │   ├── ResetPassword.tsx    – Passwort zurücksetzen
│       │   │   ├── Screens.tsx          – TV-Geräte verwalten
│       │   │   ├── Playlists.tsx        – Playlist-Liste
│       │   │   ├── PlaylistBuilder.tsx  – Drag & Drop Slide-Editor
│       │   │   ├── MediaLibrary.tsx     – Mediathek (Supabase Storage)
│       │   │   └── Settings.tsx         – Moschee-Profil + Gebetszeiten-Quelle
│       │   └── components/
│       │       ├── Layout.tsx           – Shell mit Navigation
│       │       ├── RequireAuth.tsx      – Route Guard
│       │       ├── CityPicker.tsx       – Diyanet-Stadt-Auswahl (Land→Bundesland→Stadt)
│       │       └── LocationPicker.tsx   – Berechnung-Modus (GPS/Adresse + Methode)
│       ├── screen/
│       │   ├── ScreenPlayer.tsx         – TV-Kiosk Player (Realtime, Übergänge)
│       │   └── PairingScreen.tsx        – 6-stelliger Kopplungs-Code
│       ├── slides/
│       │   ├── SlideRenderer.tsx        – Dispatcher (type → Komponente)
│       │   ├── PrayerTimesSlide.tsx     – Gebetszeiten (4 Themes)
│       │   ├── WeatherSlide.tsx         – Wetter (4 Layouts)
│       │   ├── EventsSlide.tsx          – Veranstaltungskalender
│       │   ├── DonationSlide.tsx        – Spendenaufruf
│       │   ├── SocialFollowSlide.tsx    – Social-Media-Follow
│       │   └── InstagramFeedSlide.tsx   – Instagram Feed
│       ├── widgets/                     – Legacy Widget-System (mode:'widgets')
│       └── lib/
│           ├── supabase.ts              – Supabase Client
│           ├── auth.tsx                 – AuthContext (Session, Login, Logout)
│           ├── awqatsalah.ts            – AwqatSalah API-Wrapper (immer nutzen!)
│           ├── prayertimes.ts           – adhan.js Berechnungslogik
│           ├── i18n.ts                  – Screen-seitige Übersetzungen (12 Sprachen)
│           ├── cms-i18n.ts              – CMS-seitige Übersetzungen (Type-Definitionen)
│           ├── cms-lang.tsx             – CMS-Language-Context
│           └── profile.tsx              – MosqueProfile Context + Hooks
├── supabase/
│   ├── migrations/                      – SQL Migrations (001–008)
│   └── functions/generate-image/        – Deno Edge Function (FLUX.1 Bildgenerierung)
└── CLAUDE.md                            – Entwickler-Referenz
```

---

## Routing

| Pfad | Komponente | Auth |
|------|-----------|------|
| `/tv` | PairingScreen → ScreenPlayer | ❌ |
| `/admin/login` | Login | ❌ |
| `/admin/reset-password` | ResetPassword | ❌ |
| `/admin` | Dashboard | ✅ |
| `/admin/screens` | Screens | ✅ |
| `/admin/playlists` | Playlists | ✅ |
| `/admin/playlists/:id` | PlaylistBuilder | ✅ |
| `/admin/settings` | Settings (Moschee-Profil) | ✅ |
| `/admin/media` | MediaLibrary | ✅ |

---

## Datenbankschema

```sql
-- TV-Geräte
screens (
  id            uuid PK,
  hardware_id   text UNIQUE,   -- aus localStorage generiert
  owner_id      uuid → auth.users,
  name          text,
  orientation   text,          -- 'landscape' | 'portrait'
  playlist_id   uuid → playlists,
  city_id       integer,       -- Legacy-Fallback (Diyanet)
  last_seen_at  timestamptz,   -- Heartbeat alle 60s
  paired        boolean,
  schedule      jsonb           -- ScheduleEntry[] – Zeitfenster → Playlist
)

-- Playlists
playlists (
  id              uuid PK,
  owner_id        uuid → auth.users,
  name            text,
  mode            text,         -- 'slides' | 'widgets'
  slides          jsonb,        -- Slide[]
  widgets         jsonb,        -- WidgetConfig[] (Legacy)
  ticker_overlay  jsonb,        -- TickerOverlay
  transition      text          -- Globaler Fallback: 'fade'|'slide'|'zoom'|'none'
)

-- Kopplung
pairing_codes (
  code         text PK,         -- 6-stellig, z.B. "A4F92B"
  hardware_id  text,
  created_at   timestamptz
)

-- Moschee-Profil (1 pro User)
mosque_profiles (
  user_id       uuid PK → auth.users,
  name          text,
  address       text,
  logo_url      text,
  city_id       integer,        -- Legacy Diyanet-Stadt
  city_name     text,           -- Legacy Anzeigename
  prayer_source jsonb,          -- PrayerSource (Diyanet oder Calculated)
  created_at    timestamptz
)

-- Storage
storage.media  -- Bucket: Ordner 'backgrounds/' und 'logos/', max 50 MB pro Datei
```

**RLS-Regeln:**
- `screens` + `playlists` + `mosque_profiles`: nur eigene (`owner_id` / `user_id = auth.uid()`)
- `pairing_codes`: Anon darf inserieren + löschen (TV hat beim Pairing keine Session)
- `screens` Anon-Update + Anon-Select erlaubt (Heartbeat + TV liest eigene Config)
- Realtime: `screens`-Tabelle in `supabase_realtime` publication

---

## Slide-Typen (14)

| Typ | Icon | Beschreibung | Themes / Layouts |
|-----|------|-------------|-----------------|
| `prayer_times` | 🕌 | Gebetszeiten mit Hijri-Datum | Madinah · Bosphorus · Mekka · Night |
| `media` | 🖼️ | Bild oder Video | Fullscreen · Zentriert · Geteilt |
| `ticker` | 📰 | Lauftext | Anzeige (Billboard) · Laufband (Scroll) |
| `rss` | 📡 | RSS-Feed | Editorial · Karte |
| `weather` | 🌤️ | Wetter + Vorhersage | Kino · Vorhersage · Minimal · Kacheln |
| `hadith` | 📖 | Täglicher Hadith | Wald · Mitternacht · Warm |
| `quran` | 🌙 | Quran-Vers | Violett · Madinah · Smaragd |
| `asmaul_husna` | ✨ | 99 Namen Allahs | Amber · Türkis · Indigo |
| `events` | 📅 | Veranstaltungskalender | Dunkel · Grün · Gold · Blau · Lila · Nacht |
| `donation` | 💝 | Spendenaufruf | Gold · Grün · Türkis · Lila · Warm |
| `social_follow` | 📱 | Social-Media-Follow-Aufruf | Dunkel · Hell · Bunt |
| `instagram_feed` | 📸 | Instagram Feed (Embed) | — |
| `ramadan` | ☽ | Ramadan-Ankündigung | Madinah · Nacht · Smaragd |
| `jumu_a` | 📿 | Jumu'a · Freitagsgebet | Dunkel · Gold · Blau |

### Slide-Eigenschaften

```typescript
interface Slide {
  id: string
  type: SlideType
  duration: number          // Sekunden; 0 = bleibt bis Loop-Neustart
  transition?: SlideTransition  // Übergang zu nächstem Slide: 'fade'|'slide'|'zoom'|'none'
  config: Record<string, unknown>
}
```

**Übergänge** werden pro Slide gesetzt und greifen beim Wechsel zum *nächsten* Slide.  
Im PlaylistBuilder: rechtes Panel → „Übergang zum nächsten Slide".

---

## Gebetszeiten-Quellen

Das System unterstützt zwei Modi (konfigurierbar in **Einstellungen**):

### 1. Diyanet / AwqatSalah
- Türkei-zentriert, sehr präzise für türkische Gemeinden
- Hierarchie: Land → Bundesland → Stadt → Tageszeiten
- API: `GET /api/AwqatSalah/Daily/{cityId}`
- Immer über `awqatsalah.ts` aufrufen — nie direkt

### 2. Berechnet (adhan.js)
- GPS-Koordinaten + Berechnungsmethode
- Funktioniert weltweit ohne externe Abhängigkeit
- Verfügbare Methoden:

| Methode | Geeignet für |
|---------|-------------|
| Muslim World League | Europa, Nordafrika |
| North America (ISNA) | USA, Kanada |
| Egyptian General Authority | Ägypten, Arabische Welt |
| Umm al-Qura (Makkah) | Saudi-Arabien |
| University of Karachi | Pakistan, Bangladesh |
| Dubai / Qatar / Kuwait / Singapore | Jeweilige Region |
| Tehran | Iran |
| Türkiye (Diyanet) | Türkei |

---

## Sprachen (12)

| Code | Sprache | RTL |
|------|---------|-----|
| `de` | Deutsch | ❌ |
| `en` | English | ❌ |
| `ar` | العربية | ✅ |
| `tr` | Türkçe | ❌ |
| `id` | Indonesia | ❌ |
| `bn` | বাংলা | ❌ |
| `ur` | اردو | ✅ |
| `fr` | Français | ❌ |
| `nl` | Nederlands | ❌ |
| `bs` | Bosanski | ❌ |
| `so` | Soomaali | ❌ |
| `ms` | Melayu | ❌ |

Jeder Slide hat `lang` + optional `lang2` für zweisprachige Anzeige (z. B. AR + DE).  
RTL wird automatisch per `dir="rtl"` auf dem Slide-Root gesetzt.

---

## Screen-Pairing-Flow

```
1. TV öffnet /tv → generiert hardware_id (localStorage) → INSERT pairing_codes
2. CMS: "Screen koppeln" → 6-stelligen Code eingeben
3. Supabase: screens-Eintrag erstellt → pairing_code DELETE
4. TV: Realtime UPDATE auf screens → paired = true → Redirect zu Player
5. Playlist-Änderungen: Realtime → Player wechselt sofort ohne Reload
6. Heartbeat: last_seen_at UPDATE alle 60 s → CMS zeigt Online/Offline-Status
```

---

## Screen-Scheduling

Jeder Screen hat ein `schedule: ScheduleEntry[]`-Feld. Eine `ScheduleEntry` definiert ein Zeitfenster, in dem eine andere Playlist gespielt wird als die Standard-Playlist.

```typescript
interface ScheduleEntry {
  playlist_id: string
  days: number[]      // 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
  start_time: string  // "HH:MM"
  end_time: string    // "HH:MM"
}
```

Auswertung im `ScreenPlayer`: Bei jedem Tick wird geprüft ob ein Zeitfenster aktiv ist → greift die schedule-Playlist. Außerhalb der Fenster läuft die Haupt-Playlist.

---

## PlaylistBuilder-Features

- **Slide hinzufügen** — 14 Typen, aufgeklappt per "+"-Button
- **Drag & Drop** — ⠿-Handle greifen und Slide verschieben
- **▲▼-Pfeile** — Alternative zu D&D (auch Mobil)
- **Pro-Slide-Übergang** — Zwischen je zwei Slides: Blend / Slide / Zoom / Schnitt
- **Mediathek-Picker** — Bei Bild/Video-Slides direkt aus Supabase Storage wählen
- **KI-Bildgenerierung** — FLUX.1 via Replicate, Prompt + Format (16:9 / 9:16)
- **Laufschrift-Overlay** — Ticker über beliebiger Playlist (4 Stile, Geschwindigkeit)
- **Echtzeit-Preview** — Änderungen sofort auf TV ohne Reload

---

## Mediathek

- Route: `/admin/media`
- Storage-Bucket: `media`, Ordner: `backgrounds/` und `logos/`
- Upload bis 50 MB pro Datei
- Bilder und Videos; Thumbnails im Raster
- Öffentliche URLs werden in Slide-Configs direkt eingetragen

---

## Moschee-Profil (Settings)

- Route: `/admin/settings`
- Name, Adresse, Logo (aus Mediathek oder URL)
- **Gebetszeiten-Quelle** wählen: Diyanet (Stadt-Picker) oder Berechnet (GPS + Methode)
- Profil-Daten werden im `ScreenPlayer` geladen und an Slides weitergereicht

---

## Externe APIs

| Service | URL / Package | Zweck |
|---------|--------------|-------|
| Supabase | `mosque-api.401dev.de` | DB, Auth, Storage, Realtime |
| AwqatSalah | `mosque-api.401dev.de/awqat` | Diyanet Gebetszeiten |
| adhan.js | npm `adhan` | Berechnete Gebetszeiten |
| alquran.cloud | `api.alquran.cloud/v1` | Quran-Verse + Übersetzungen |
| fawazahmed0 CDN | `cdn.jsdelivr.net` | Hadith-Datasets |
| api.rss2json.com | — | RSS → JSON |
| Open-Meteo | `api.open-meteo.com` | Wetterdaten (kostenlos) |
| Replicate (FLUX.1) | Edge Function | KI-Bildgenerierung |

---

## Setup (lokal)

```bash
# Abhängigkeiten
cd app && npm install

# Umgebungsvariablen
cp .env.example .env
# Folgende Werte setzen:
# VITE_SUPABASE_URL=https://mosque-api.401dev.de
# VITE_SUPABASE_ANON_KEY=...
# VITE_AWQATSALAH_URL=https://mosque-api.401dev.de/awqat
# VITE_REPLICATE_API_TOKEN=...

# Supabase lokal (optional)
supabase start
supabase db push  # Migrations ausführen

# Dev-Server
npm run dev
```

---

## Deployment (Produktionsserver)

**Server:** 178.254.1.229  
**URLs:**
- App: https://mosque.401dev.de (Nginx → `app/dist/`)
- Supabase API: https://mosque-api.401dev.de (Nginx → localhost:54341)
- AwqatSalah: https://mosque-api.401dev.de/awqat (Nginx Proxy → localhost:8082)

```bash
# Build & Deploy (auf dem Server)
cd ~/dev/mosque-signage/app
npm run build
# Nginx serviert app/dist/ automatisch — kein Restart nötig
```

**Wichtig:** `api.401dev.de` (Port 54321) gehört zum **Staccato**-Projekt — nicht anfassen.  
Das Mosque-Supabase läuft auf Port **54341** → `mosque-api.401dev.de`.

Neue Subdomain hinzufügen:
```bash
# 1. Nginx-Block in /etc/nginx/sites-available/mosque ergänzen
# 2. SSL-Zertifikat erweitern:
sudo certbot --expand \
  -d 401dev.de -d www.401dev.de \
  -d api.401dev.de -d mosque-api.401dev.de \
  -d NEUE-DOMAIN.401dev.de \
  --nginx
# DNS nicht nötig — Wildcard *.401dev.de → 178.254.1.229
```
