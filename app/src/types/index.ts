export type Orientation = 'landscape' | 'portrait'

export type WidgetType =
  | 'prayer_times'
  | 'media'
  | 'ticker'
  | 'weather'
  | 'rss'

export type ThemeId = 'classic' | 'modern-minimal' | 'dark-elegant' | 'ramadan'

export interface WidgetConfig {
  id: string
  type: WidgetType
  col?: number      // grid column start (1-12 for landscape)
  row?: number      // grid row start (1-6 for landscape)
  colSpan?: number
  rowSpan?: number
  config: Record<string, unknown>
}

export interface TickerOverlay {
  enabled: boolean
  texts: string[]
  style: 'dark' | 'gold' | 'green' | 'light'
  speed: number
}

export interface ScheduleEntry {
  playlist_id: string
  days: number[]      // 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
  start_time: string  // "HH:MM"
  end_time: string    // "HH:MM"
}

export interface Playlist {
  id: string
  name: string
  slides: Slide[]
  ticker_overlay?: TickerOverlay | null
  transition?: 'fade' | 'slide' | 'zoom' | 'none'
  owner_id: string
  created_at: string
}

export interface Screen {
  id: string
  name: string
  orientation: Orientation
  hardware_id: string
  pairing_code: string | null
  paired: boolean
  playlist_id: string | null
  last_seen_at: string | null
  owner_id: string
  city_id: number | null
  schedule?: ScheduleEntry[]
  azan_config?: AzanConfig | null
}

export interface PairingCode {
  code: string
  hardware_id: string
  created_at: string
}

export type PrayerTheme = 'madinah' | 'bosphorus' | 'mekka' | 'night'

export type SlideTransition = 'fade' | 'slide' | 'zoom' | 'none'

export interface Slide {
  id: string
  type: 'prayer_times' | 'media' | 'ticker' | 'rss' | 'weather' | 'hadith' | 'quran' | 'asmaul_husna' | 'events' | 'donation' | 'social_follow' | 'instagram_feed' | 'ramadan' | 'jumu_a'
  duration: number  // seconds; 0 = stays until playlist loops
  transition?: SlideTransition  // transition OUT of this slide (to the next)
  config: Record<string, unknown>
}

export interface MosqueProfile {
  user_id: string
  name: string
  address: string
  logo_url: string | null
  city_id: number | null
  city_name: string | null
  /** Unified prayer-times source — overrides city_id/city_name when set */
  prayer_source: PrayerSource | null
  created_at: string
}

// AwqatSalah API response shape
export interface PrayerTimes {
  fajr: string
  sunrise: string
  dhuhr: string
  asr: string
  maghrib: string
  isha: string
  hijriDateLong?: string
}

// Prayer time source configuration
export type PrayerMethod =
  | 'MWL' | 'ISNA' | 'Egyptian' | 'UmmAlQura' | 'Karachi'
  | 'Dubai' | 'Qatar' | 'Kuwait' | 'Singapore' | 'Tehran' | 'Turkey'

export interface DiyanetSource {
  source: 'diyanet'
  cityId: number
  cityName?: string
}

export interface CalculatedSource {
  source: 'calculated'
  lat: number
  lng: number
  method: PrayerMethod
  locationName?: string
}

export type PrayerSource = DiyanetSource | CalculatedSource

// ── Ezan / Azan ───────────────────────────────────────────────────────────────

export type AzanPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export interface AzanPrayerConfig {
  /** Public URL zur Audio-Datei im Supabase Storage (null = kein eigener Ton) */
  url: string | null
  /** Originaler Dateiname für die Anzeige im UI */
  name?: string
}

export interface AzanConfig {
  /** Ezan-Feature für diesen Screen aktiv */
  enabled: boolean
  /** Vollbild-Overlay während des Ezans anzeigen */
  overlay: boolean
  /** Pro Gebet individuelle Audio-Datei */
  prayers: Partial<Record<AzanPrayer, AzanPrayerConfig>>
}

export interface DeviceCommand {
  id: string
  hardware_id: string
  command: 'restart_kiosk' | 'reboot' | 'clear_cache' | 'update_scripts' | 'set_orientation' | 'trigger_azan'
  payload: Record<string, unknown>
  created_at: string
  executed_at: string | null
  result: string | null
  status: 'pending' | 'done' | 'error'
}
