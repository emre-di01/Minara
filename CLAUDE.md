# CLAUDE.md — Mosque Signage

## Projektstruktur auf einen Blick

```
app/src/cms/pages/
  Dashboard.tsx          – Übersicht
  Login.tsx              – Auth
  ResetPassword.tsx      – Passwort-Reset
  Screens.tsx            – TV-Geräte + Pairing + Scheduling
  Playlists.tsx          – Playlist-Liste
  PlaylistBuilder.tsx    – Slide-Editor (Drag & Drop, Übergänge, Mediathek)
  MediaLibrary.tsx       – Supabase Storage Browser
  Settings.tsx           – Moschee-Profil + Gebetszeiten-Quelle

app/src/cms/components/
  Layout.tsx             – Shell + Navigation
  RequireAuth.tsx        – Route Guard
  CityPicker.tsx         – Diyanet Land→Bundesland→Stadt
  LocationPicker.tsx     – GPS/Adresse + Berechnungsmethode

app/src/screen/
  ScreenPlayer.tsx       – TV-Kiosk Player (Realtime, CSS-Keyframe-Übergänge)
  PairingScreen.tsx      – 6-stelliger Kopplungs-Code

app/src/slides/
  SlideRenderer.tsx      – Dispatcher (type → Slide-Komponente)
  PrayerTimesSlide.tsx   – 4 Prayer-Themes
  WeatherSlide.tsx       – 4 Layouts
  EventsSlide.tsx        – Veranstaltungskalender
  DonationSlide.tsx      – Spendenaufruf
  SocialFollowSlide.tsx  – Social-Media-Follow
  InstagramFeedSlide.tsx – Instagram Feed

app/src/lib/
  supabase.ts            – Supabase Client
  auth.tsx               – AuthContext
  awqatsalah.ts          – AwqatSalah API-Wrapper (immer nutzen!)
  prayertimes.ts         – adhan.js Berechnung (METHOD_LABELS, getPrayerTimes)
  i18n.ts                – Screen-seitige i18n (12 Sprachen, PRAYER_NAMES, LANGUAGES)
  cms-i18n.ts            – CMS i18n Typ-Definitionen + alle Übersetzungen
  cms-lang.tsx           – useCmsT() Hook
  profile.tsx            – MosqueProfile Context

app/src/types/index.ts   – Alle TypeScript-Typen

supabase/migrations/
  001_schema.sql         – screens, playlists, pairing_codes, RLS
  002_slides.sql         – playlists.slides JSONB
  003_storage.sql        – media Bucket
  004_ticker_overlay.sql – playlists.ticker_overlay JSONB
  005_mosque_profiles.sql – mosque_profiles Tabelle
  006_profile_city_name.sql – mosque_profiles.city_name
  007_scheduling.sql     – screens.schedule JSONB + playlists.transition
  008_profile_prayer_source.sql – mosque_profiles.prayer_source JSONB

supabase/functions/generate-image/ – Deno Edge Function (Replicate FLUX.1)
```

---

## Befehle

```bash
# Build (Produktionsdeploy)
cd app && npm run build
# Nginx serviert app/dist/ → keine weiteren Schritte nötig

# Dev-Server
cd app && nohup node_modules/.bin/vite > /tmp/vite.log 2>&1 &
tail -f /tmp/vite.log

# TypeScript-Check (ohne Build)
cd app && npx tsc --noEmit

# Supabase-Status
supabase status  # Zeigt Anon-Key, API-URL, DB-URL

# AwqatSalah-Container prüfen
docker ps | grep awqatsalah
docker start awqatsalah  # Falls down
```

---

## Produktionsserver

| Was | Wo |
|-----|----|
| Server | 178.254.1.229 |
| App | https://mosque.401dev.de |
| Supabase API | https://mosque-api.401dev.de → localhost:54341 |
| AwqatSalah | https://mosque-api.401dev.de/awqat → localhost:8082 |
| Supabase Studio | http://127.0.0.1:54344 (nur lokal erreichbar) |

**ACHTUNG:** `api.401dev.de` (Port 54321) gehört zum **Staccato**-Projekt — nicht anfassen.

Supabase-Container:
- `supabase_kong_mosque-signage` → Port 54341 (mosque)
- `supabase_kong_staccato`       → Port 54321 (staccato)

---

## .env (app/.env)

```
VITE_SUPABASE_URL=https://mosque-api.401dev.de
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
VITE_AWQATSALAH_URL=https://mosque-api.401dev.de/awqat
VITE_REPLICATE_API_TOKEN=...
```

`VITE_AWQATSALAH_URL` zeigt auf `mosque-api.401dev.de/awqat` — der AwqatSalah-Container läuft im Staccato-Nginx-Block als Reverse-Proxy auf Port 8082.

---

## Datenbankschema

```sql
screens        – hardware_id (unique), owner_id, playlist_id, city_id,
                 last_seen_at, paired, schedule JSONB ([]ScheduleEntry)

playlists      – mode ('widgets'|'slides'), slides JSONB, widgets JSONB,
                 ticker_overlay JSONB, transition TEXT ('fade'|'slide'|'zoom'|'none')

pairing_codes  – code (6-stellig, PK), hardware_id

mosque_profiles – user_id (PK), name, address, logo_url,
                  city_id (Legacy), city_name (Legacy),
                  prayer_source JSONB (DiyanetSource | CalculatedSource)

storage.media  – Bucket: Ordner backgrounds/ und logos/, max 50 MB
```

RLS-Regeln:
- `screens` + `playlists` + `mosque_profiles`: nur eigene (owner_id / user_id = auth.uid())
- `pairing_codes`: Anon darf inserieren + löschen
- `screens` Anon-Update + Anon-Select erlaubt (Heartbeat + TV liest Config)

Realtime: `screens`-Tabelle in `supabase_realtime` publication.

---

## TypeScript-Typen (Auszug)

```typescript
type SlideTransition = 'fade' | 'slide' | 'zoom' | 'none'

interface Slide {
  id: string
  type: 'prayer_times' | 'media' | 'ticker' | 'rss' | 'weather' | 'hadith'
      | 'quran' | 'asmaul_husna' | 'events' | 'donation' | 'social_follow'
      | 'instagram_feed' | 'ramadan' | 'jumu_a'
  duration: number          // Sekunden; 0 = bleibt bis Loop-Neustart
  transition?: SlideTransition  // Übergang zu nächstem Slide
  config: Record<string, unknown>
}

interface Playlist {
  id: string; name: string; mode: 'widgets' | 'slides'
  slides: Slide[]; widgets: WidgetConfig[]
  ticker_overlay?: TickerOverlay | null
  transition?: SlideTransition   // Globaler Fallback (deprecated, pro-Slide gewinnt)
}

interface Screen {
  id: string; hardware_id: string; owner_id: string
  name: string; orientation: 'landscape' | 'portrait'
  playlist_id: string | null; city_id: number | null
  last_seen_at: string | null; paired: boolean
  schedule?: ScheduleEntry[]
}

interface ScheduleEntry {
  playlist_id: string
  days: number[]     // 0=So 1=Mo 2=Di 3=Mi 4=Do 5=Fr 6=Sa
  start_time: string // "HH:MM"
  end_time: string   // "HH:MM"
}

interface MosqueProfile {
  user_id: string; name: string; address: string
  logo_url: string | null
  city_id: number | null; city_name: string | null  // Legacy Diyanet
  prayer_source: PrayerSource | null
}

type PrayerSource =
  | { source: 'diyanet'; cityId: number; cityName?: string }
  | { source: 'calculated'; lat: number; lng: number; method: PrayerMethod; locationName?: string }
```

---

## AwqatSalah API

```typescript
// Hierarchie: Country → State → City → Daily
getCountries()        // GET /api/Place/Countries
getStates(countryId)  // GET /api/Place/States/{id}
getCities(stateId)    // GET /api/Place/Cities/{id}
getDailyPrayerTimes(cityId)  // GET /api/AwqatSalah/Daily/{id}

// Response immer: { data: [...], success: bool, message: string }
// Unwrapping erledigt awqatsalah.ts get()
```

**Nie die Diyanet API direkt aufrufen — immer über `awqatsalah.ts`.**

---

## Gebetszeiten-Berechnung (adhan.js)

```typescript
import { getPrayerTimes } from './prayertimes'
import type { PrayerSource } from '../types'

// Unified API für beide Quellen:
const times = await getPrayerTimes(prayerSource, date)
// Gibt PrayerTimes { fajr, sunrise, dhuhr, asr, maghrib, isha } zurück

// Verfügbare Berechnungsmethoden:
import { METHOD_LABELS, METHOD_LIST } from './prayertimes'
// METHOD_LIST = [['MWL', 'Muslim World League'], ['ISNA', ...], ...]
```

---

## i18n

**Screen-seitig** (`i18n.ts`): 12 Sprachen, `PRAYER_NAMES[lang]`, `LANGUAGES`, `isRTL(lang)`.  
**CMS-seitig** (`cms-i18n.ts` + `cms-lang.tsx`): `useCmsT()` Hook gibt `t` zurück.  
AR und UR sind RTL — `isRTL()` prüfen und `dir="rtl"` setzen.  
Jeder Slide hat `lang` + optional `lang2` (zweisprachige Gebetszeiten-Anzeige).

---

## ScreenPlayer — Übergänge

CSS-Keyframe-basiert (kein `transition`-Property, kein double-rAF-Hack):

```typescript
// Keyframes: ms-fade-in/out, ms-slide-in/out, ms-zoom-in/out
// Übergang pro Slide: slides[idx].transition ?? 'fade'
// Bei Wechsel: prevIdx (exit-Animation) + idx (enter-Animation)
// TRANS_DURATION = 650ms
```

Timing: `delay = max(50, duration * 1000 - TRANS_DURATION)` — Übergang startet kurz vor Slideende.

---

## PlaylistBuilder — Wichtige State-Variablen

```typescript
slides          – Slide[]        – aktuelle Slide-Liste
selected        – string | null  – id des selektierten Slides
dragId          – string | null  – id des Slides beim Drag & Drop
dragOverId      – string | null  – id des Drop-Targets
mobilePanel     – 'list'|'config'
tickerOverlay   – TickerOverlay
```

Funktionen: `addSlide`, `removeSlide`, `moveSlide`, `updateSlideConfig`,  
`updateSlideDuration`, `updateSlideTransition`, `handleDrop`, `save`.

---

## Neue Subdomain (Nginx + SSL)

```bash
# 1. Block in /etc/nginx/sites-available/mosque ergänzen (sudo)
# 2. Zertifikat erweitern:
sudo certbot --expand \
  -d 401dev.de -d www.401dev.de \
  -d api.401dev.de -d mosque-api.401dev.de \
  -d NEUE.401dev.de \
  --nginx
# DNS-Eintrag nicht nötig — Wildcard *.401dev.de → 178.254.1.229
```

---

## Häufige Fehler

| Fehler | Ursache | Fix |
|--------|---------|-----|
| 404 auf `/rest/v1/screens` | `.env` falsche Supabase-URL | `VITE_SUPABASE_URL=https://mosque-api.401dev.de` + `npm run build` |
| SSL-Fehler neue Subdomain | Subdomain nicht im Zertifikat | `certbot --expand` mit neuer Domain |
| TV zeigt alten Stand | `dist/` nicht aktuell | `npm run build` |
| Gebetszeiten laden nicht | AwqatSalah-Container down | `docker start awqatsalah` |
| Übergänge funktionieren nicht | `transition` not set on Slide | Default ist `'fade'`, explizit setzen per `updateSlideTransition` |
| Mediathek leer | Storage-Ordner nicht angelegt | Einmal manuell in Supabase Studio `backgrounds/` und `logos/` anlegen |

---

## Regeln

- Kein Next.js, kein Express — Supabase ist das einzige Backend.
- `crypto.randomUUID()` nicht über HTTP verwenden → `Math.random().toString(36).slice(2)` für IDs.
- Alle neuen Tabellen/Spalten als Migration in `supabase/migrations/` anlegen.
- RLS immer aktivieren, Multi-Tenancy über `owner_id = auth.uid()`.
- Gebetszeiten immer über `awqatsalah.ts` (Diyanet) oder `prayertimes.ts` (Calculated) — nie direkt an Diyanet API.
- Neue i18n-Keys in `cms-i18n.ts` Typ + alle 7 Sprachblöcke (DE, EN, TR, AR, FR, NL, BS) gleichzeitig eintragen.
- Nach jeder Änderung: `npx tsc --noEmit` + `npm run build` prüfen.
