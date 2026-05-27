/**
 * offline-cache.ts — Minara IndexedDB Offline-Cache
 *
 * Stores:
 *   screen-config  → letzter bekannter Screen/Playlist/Profile-State
 *   content-pool   → Hadith- und Quran-Ayah-Pool (wächst beim Online-Betrieb)
 *   weather        → letzte Wetterdaten pro Stadt
 *   rss            → letzte RSS-Items pro Feed-URL
 */

import type { MosqueProfile, Playlist, Screen } from '../types'

// ── IndexedDB-Basis ───────────────────────────────────────────────────────────

const DB_NAME = 'minara-offline'
const DB_VERSION = 1
type StoreName = 'screen-config' | 'content-pool' | 'weather' | 'rss'

let _db: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return _db
  _db = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => { _db = null; reject(req.error) }
    req.onsuccess = () => resolve(req.result as IDBDatabase)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      for (const name of ['screen-config', 'content-pool', 'weather', 'rss'] as const) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
      }
    }
  })
  return _db
}

async function dbGet<T>(store: StoreName, key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve((req.result as T) ?? null)
    })
  } catch { return null }
}

async function dbSet(store: StoreName, key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(store, 'readwrite').objectStore(store).put(value, key)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  } catch { /* Write-Fehler ignorieren — Offline-Cache ist best-effort */ }
}

// ── Screen-Config ─────────────────────────────────────────────────────────────

export interface CachedScreenConfig {
  screen: Screen
  playlist: Playlist
  profile: MosqueProfile | null
  ts: number
}

export async function saveScreenConfig(
  hardwareId: string,
  cfg: Omit<CachedScreenConfig, 'ts'>
): Promise<void> {
  await dbSet('screen-config', hardwareId, { ...cfg, ts: Date.now() })
}

export async function loadScreenConfig(
  hardwareId: string
): Promise<CachedScreenConfig | null> {
  return dbGet<CachedScreenConfig>('screen-config', hardwareId)
}

// ── Content-Pool: Hadith ──────────────────────────────────────────────────────

export interface HadithItem { text: string; source: string }

// Hardcoded Fallbacks — immer verfügbar, auch vor erstem Online-Start
const FALLBACK_HADITHS: HadithItem[] = [
  {
    text: 'Die Taten werden nur nach den Absichten beurteilt, und jedem Menschen wird (vergolten), was er beabsichtigt hat.',
    source: 'Sahih al-Bukhari',
  },
  {
    text: 'Keiner von euch glaubt vollständig, bis er für seinen Bruder das liebt, was er für sich selbst liebt.',
    source: 'Sahih al-Bukhari',
  },
  {
    text: 'Das Beste unter euch ist derjenige, der den Quran lernt und ihn anderen lehrt.',
    source: 'Sahih al-Bukhari',
  },
  {
    text: 'Lächeln gegenüber deinem Bruder ist eine Wohltat (Sadaqa).',
    source: 'Jami at-Tirmidhi',
  },
  {
    text: 'Der Stärkste ist nicht derjenige, der andere niederwirft, sondern derjenige, der sich selbst im Zorn beherrscht.',
    source: 'Sahih al-Bukhari',
  },
  {
    text: 'Wer an Allah und den Jüngsten Tag glaubt, soll Gutes sagen oder schweigen.',
    source: 'Sahih al-Bukhari',
  },
]

export async function addHadithToPool(item: HadithItem): Promise<void> {
  const pool = (await dbGet<HadithItem[]>('content-pool', 'hadith')) ?? []
  // Deduplizieren + auf max. 50 begrenzen
  const updated = [item, ...pool.filter(h => h.text !== item.text)].slice(0, 50)
  await dbSet('content-pool', 'hadith', updated)
}

export async function getHadithFromPool(): Promise<HadithItem> {
  const pool = (await dbGet<HadithItem[]>('content-pool', 'hadith')) ?? []
  const all = [...pool, ...FALLBACK_HADITHS]
  return all[Math.floor(Math.random() * all.length)]!
}

// ── Content-Pool: Quran ───────────────────────────────────────────────────────

export interface AyahItem {
  arabic: string
  translation: string
  surah: string
  ayah: number
}

// Fallback-Ayah pro Sprache — immer verfügbar
const FALLBACK_AYAHS: Record<string, AyahItem> = {
  de: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Wahrlich, mit der Schwierigkeit kommt Erleichterung.', surah: 'Al-Inshirah', ayah: 6 },
  en: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Indeed, with hardship will be ease.', surah: 'Al-Inshirah', ayah: 6 },
  tr: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Doğrusu güçlükle beraber kolaylık vardır.', surah: 'Al-İnşirah', ayah: 6 },
  ar: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'إن مع العسر يسرًا', surah: 'الانشراح', ayah: 6 },
  fr: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'En vérité, avec la difficulté vient la facilité.', surah: 'Al-Inshirah', ayah: 6 },
  nl: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Voorwaar, na elke moeilijkheid is er gemak.', surah: 'Al-Inshirah', ayah: 6 },
  bs: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Zaista, uz teškoću dolazi olakšanje.', surah: 'Al-Inshirah', ayah: 6 },
  ur: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'بے شک تکلیف کے ساتھ آسانی ہے۔', surah: 'Al-Inshirah', ayah: 6 },
}

export async function addAyahToPool(lang: string, item: AyahItem): Promise<void> {
  const key = `quran:${lang}`
  const pool = (await dbGet<AyahItem[]>('content-pool', key)) ?? []
  const updated = [item, ...pool.filter(a => a.arabic !== item.arabic)].slice(0, 30)
  await dbSet('content-pool', key, updated)
}

export async function getAyahFromPool(lang: string): Promise<AyahItem> {
  const key = `quran:${lang}`
  const pool = (await dbGet<AyahItem[]>('content-pool', key)) ?? []
  const fallback = FALLBACK_AYAHS[lang] ?? FALLBACK_AYAHS['de']!
  const all = pool.length > 0 ? pool : [fallback]
  return all[Math.floor(Math.random() * all.length)]!
}

// ── Wetter-Cache ──────────────────────────────────────────────────────────────

export interface WeatherNowData {
  temp: number; feelsLike: number; humidity: number
  windspeed: number; code: number; name: string
}
export interface WeatherDailyData {
  date: string; code: number; tempMax: number; tempMin: number
}
export interface WeatherCache {
  now: WeatherNowData
  daily: WeatherDailyData[]
  ts: number
}

export const WEATHER_TTL = 3 * 60 * 60 * 1000 // 3 Stunden

export async function saveWeather(city: string, data: Omit<WeatherCache, 'ts'>): Promise<void> {
  await dbSet('weather', city.toLowerCase(), { ...data, ts: Date.now() })
}

export async function loadWeather(city: string): Promise<WeatherCache | null> {
  return dbGet<WeatherCache>('weather', city.toLowerCase())
}

// ── RSS-Cache ─────────────────────────────────────────────────────────────────

export interface RssCachedItem {
  title: string
  description: string
  thumbnail?: string
  enclosure?: { url?: string; type?: string }
}

export interface RssCache {
  items: RssCachedItem[]
  ts: number
}

export const RSS_TTL = 24 * 60 * 60 * 1000 // 24 Stunden

export async function saveRss(url: string, items: RssCachedItem[]): Promise<void> {
  await dbSet('rss', url, { items, ts: Date.now() })
}

export async function loadRss(url: string): Promise<RssCache | null> {
  return dbGet<RssCache>('rss', url)
}
