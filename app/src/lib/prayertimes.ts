/**
 * Unified prayer times service.
 * Supports two sources:
 *   - 'diyanet'    → AwqatSalah local container (Diyanet/Turkey data)
 *   - 'calculated' → adhan.js local calculation (lat/lng + method)
 */
import * as adhan from 'adhan'
import { getDailyPrayerTimes } from './awqatsalah'
import type { PrayerTimes, PrayerSource, PrayerMethod, CalculatedSource } from '../types'

// ── Adhan method map ──────────────────────────────────────────────────────────

function getAdhanParams(method: PrayerMethod): adhan.CalculationParameters {
  switch (method) {
    case 'MWL':       return adhan.CalculationMethod.MuslimWorldLeague()
    case 'ISNA':      return adhan.CalculationMethod.NorthAmerica()
    case 'Egyptian':  return adhan.CalculationMethod.Egyptian()
    case 'UmmAlQura': return adhan.CalculationMethod.UmmAlQura()
    case 'Karachi':   return adhan.CalculationMethod.Karachi()
    case 'Dubai':     return adhan.CalculationMethod.Dubai()
    case 'Qatar':     return adhan.CalculationMethod.Qatar()
    case 'Kuwait':    return adhan.CalculationMethod.Kuwait()
    case 'Singapore': return adhan.CalculationMethod.Singapore()
    case 'Tehran':    return adhan.CalculationMethod.Tehran()
    case 'Turkey':    return adhan.CalculationMethod.Turkey()
    default:          return adhan.CalculationMethod.MuslimWorldLeague()
  }
}

/** Human-readable labels for each method, used in the UI */
export const METHOD_LABELS: Record<PrayerMethod, string> = {
  MWL:       'Muslim World League',
  ISNA:      'North America (ISNA)',
  Egyptian:  'Egyptian General Authority',
  UmmAlQura: 'Umm al-Qura (Makkah)',
  Karachi:   'University of Karachi',
  Dubai:     'Dubai',
  Qatar:     'Qatar',
  Kuwait:    'Kuwait',
  Singapore: 'Singapore',
  Tehran:    'Tehran (Iran)',
  Turkey:    'Türkiye (Diyanet)',
}

export const METHOD_LIST = Object.entries(METHOD_LABELS) as [PrayerMethod, string][]

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number): string { return String(n).padStart(2, '0') }
function toHHMM(d: Date): string { return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

// ── Calculated (adhan.js) ─────────────────────────────────────────────────────

export function calculatePrayerTimes(
  lat: number,
  lng: number,
  method: PrayerMethod,
  date = new Date(),
): PrayerTimes {
  const coords = new adhan.Coordinates(lat, lng)
  const params = getAdhanParams(method)
  const pt = new adhan.PrayerTimes(coords, date, params)
  return {
    fajr:    toHHMM(pt.fajr),
    sunrise: toHHMM(pt.sunrise),
    dhuhr:   toHHMM(pt.dhuhr),
    asr:     toHHMM(pt.asr),
    maghrib: toHHMM(pt.maghrib),
    isha:    toHHMM(pt.isha),
  }
}

// ── Geocoding via OpenStreetMap Nominatim (free, no API key) ──────────────────

export interface GeoResult {
  lat: number
  lng: number
  displayName: string
}

export async function geocodeCity(query: string): Promise<GeoResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`
  const res = await fetch(url, { headers: { 'Accept-Language': 'de,en' } })
  if (!res.ok) return []
  const data = await res.json() as { lat: string; lon: string; display_name: string }[]
  return data.map(r => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), displayName: r.display_name }))
}

// ── Unified entry point ───────────────────────────────────────────────────────

/**
 * Fetch prayer times from either source.
 * `fallbackCityId` is the screen-level Diyanet city ID used when no slide-level
 * source is configured (backward-compatible).
 */
export async function getPrayerTimes(
  source: PrayerSource | null | undefined,
  fallbackCityId?: number,
): Promise<PrayerTimes | null> {
  // ── Calculated ──
  if (source?.source === 'calculated') {
    const s = source as CalculatedSource
    return calculatePrayerTimes(s.lat, s.lng, s.method)
  }

  // ── Diyanet ──
  const cityId = source?.source === 'diyanet' ? source.cityId : fallbackCityId
  if (!cityId) return null
  return getDailyPrayerTimes(cityId)
}
