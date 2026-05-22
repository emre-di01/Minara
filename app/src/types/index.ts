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

export interface Playlist {
  id: string
  name: string
  theme: ThemeId
  widgets: WidgetConfig[]
  mode: 'widgets' | 'slides'
  slides: Slide[]
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
  city_id: number | null   // Diyanet city ID für Gebetszeiten
}

export interface PairingCode {
  code: string
  hardware_id: string
  created_at: string
}

export type PrayerTheme = 'madinah' | 'bosphorus' | 'mekka' | 'night'

export interface Slide {
  id: string
  type: 'prayer_times' | 'media' | 'ticker' | 'rss' | 'weather' | 'hadith' | 'quran' | 'asmaul_husna'
  duration: number  // seconds; 0 = stays until playlist loops
  config: Record<string, unknown>
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
