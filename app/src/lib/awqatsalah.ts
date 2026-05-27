import type { PrayerTimes } from '../types'

const BASE = import.meta.env.VITE_AWQATSALAH_URL ?? 'http://localhost:8082'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`AwqatSalah ${path} → ${res.status}`)
  const json = await res.json()
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json
}

export async function getDailyPrayerTimes(cityId: number): Promise<PrayerTimes> {
  const list = await get<PrayerTimes[]>(`/api/awqatsalah/Daily/${cityId}`)
  return list[0]
}

export function getWeeklyPrayerTimes(cityId: number): Promise<PrayerTimes[]> {
  return get<PrayerTimes[]>(`/api/awqatsalah/Weekly/${cityId}`)
}

export function getCountries() {
  return get<{ id: number; name: string }[]>('/api/Place/Countries')
}

export function getStates(countryId: number) {
  return get<{ id: number; name: string }[]>(`/api/Place/States/${countryId}`)
}

export function getCities(stateId: number) {
  return get<{ id: number; name: string }[]>(`/api/Place/Cities/${stateId}`)
}

export interface DailyContent {
  hadith: string
  hadithSource: string
  verse: string
  verseSource: string
  pray: string
  praySource: string | null
}

export function getDailyContent(): Promise<DailyContent> {
  return get<DailyContent>('/api/DailyContent')
}
