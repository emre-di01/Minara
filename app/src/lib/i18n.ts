export type LangCode = 'de' | 'en' | 'ar' | 'tr' | 'id' | 'bn' | 'ur' | 'fr' | 'nl' | 'bs' | 'so' | 'ms'

export const LANGUAGES: { code: LangCode; label: string; rtl?: boolean }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'tr', label: 'Türkçe' },
  { code: 'id', label: 'Indonesia' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ur', label: 'اردو', rtl: true },
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'bs', label: 'Bosanski' },
  { code: 'so', label: 'Soomaali' },
  { code: 'ms', label: 'Melayu' },
]

export const isRTL = (lang: LangCode) => lang === 'ar' || lang === 'ur'

// ─── Prayer names ─────────────────────────────────────────────────────────────

type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export const PRAYER_NAMES: Record<LangCode, Record<PrayerKey, string>> = {
  de: { fajr: 'Fajr',    sunrise: 'Sonnenaufgang', dhuhr: 'Dhuhr',   asr: 'Asr',     maghrib: 'Maghrib', isha: 'Isha'     },
  en: { fajr: 'Fajr',    sunrise: 'Sunrise',       dhuhr: 'Dhuhr',   asr: 'Asr',     maghrib: 'Maghrib', isha: 'Isha'     },
  ar: { fajr: 'الفجر',   sunrise: 'الشروق',        dhuhr: 'الظهر',   asr: 'العصر',   maghrib: 'المغرب',  isha: 'العشاء'   },
  tr: { fajr: 'İmsak',   sunrise: 'Güneş',         dhuhr: 'Öğle',    asr: 'İkindi',  maghrib: 'Akşam',   isha: 'Yatsı'    },
  id: { fajr: 'Subuh',   sunrise: 'Syuruq',        dhuhr: 'Zuhur',   asr: 'Ashar',   maghrib: 'Maghrib', isha: 'Isya'     },
  bn: { fajr: 'ফজর',     sunrise: 'সূর্যোদয়',      dhuhr: 'যোহর',    asr: 'আসর',     maghrib: 'মাগরিব',  isha: 'ইশা'      },
  ur: { fajr: 'فجر',     sunrise: 'طلوعِ آفتاب',   dhuhr: 'ظہر',     asr: 'عصر',     maghrib: 'مغرب',    isha: 'عشاء'     },
  fr: { fajr: 'Fajr',    sunrise: 'Lever',         dhuhr: 'Dohr',    asr: 'Asr',     maghrib: 'Maghrib', isha: 'Icha'     },
  nl: { fajr: 'Fajr',    sunrise: 'Zonsopgang',    dhuhr: 'Dohr',    asr: 'Asr',     maghrib: 'Maghrib', isha: 'Isha'     },
  bs: { fajr: 'Sabah',   sunrise: 'Izlazak',       dhuhr: 'Podne',   asr: 'Ikindija',maghrib: 'Akšam',   isha: 'Jacija'   },
  so: { fajr: 'Subax',   sunrise: 'Bax-qoraxo',    dhuhr: 'Duhr',    asr: 'Asr',     maghrib: 'Fiid',    isha: 'Cishe'    },
  ms: { fajr: 'Subuh',   sunrise: 'Syuruk',        dhuhr: 'Zuhur',   asr: 'Asar',    maghrib: 'Maghrib', isha: 'Isyak'    },
}

// ─── UI strings ───────────────────────────────────────────────────────────────

export const UI: Record<LangCode, { next: string; remaining: string; prayer: string }> = {
  de: { next: 'Nächste',     remaining: 'verbleibend', prayer: 'Gebetszeiten' },
  en: { next: 'Next',        remaining: 'remaining',   prayer: 'Prayer Times' },
  ar: { next: 'التالية',     remaining: 'متبقي',       prayer: 'أوقات الصلاة' },
  tr: { next: 'Sonraki',     remaining: 'kalan',       prayer: 'Namaz Vakitleri' },
  id: { next: 'Berikutnya',  remaining: 'tersisa',     prayer: 'Jadwal Shalat' },
  bn: { next: 'পরবর্তী',     remaining: 'বাকি',        prayer: 'নামাজের সময়' },
  ur: { next: 'اگلی',        remaining: 'باقی',        prayer: 'نماز کے اوقات' },
  fr: { next: 'Prochain',    remaining: 'restant',     prayer: 'Horaires de prière' },
  nl: { next: 'Volgende',    remaining: 'resterend',   prayer: 'Gebedstijden' },
  bs: { next: 'Sljedeći',    remaining: 'preostalo',   prayer: 'Vakat' },
  so: { next: 'Xiga',        remaining: 'haray',       prayer: 'Waqtiyada Salaadda' },
  ms: { next: 'Seterusnya',  remaining: 'berbaki',     prayer: 'Waktu Solat' },
}

// ─── Date locale ──────────────────────────────────────────────────────────────

const DATE_LOCALE: Record<LangCode, string> = {
  de: 'de-DE', en: 'en-GB', ar: 'ar-SA', tr: 'tr-TR',
  id: 'id-ID', bn: 'bn-BD', ur: 'ur-PK', fr: 'fr-FR',
  nl: 'nl-NL', bs: 'bs-BA', so: 'so-SO', ms: 'ms-MY',
}

export function formatDate(d: Date, lang: LangCode) {
  return d.toLocaleDateString(DATE_LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Quran translation editions ───────────────────────────────────────────────

export const QURAN_EDITION: Partial<Record<LangCode, string>> = {
  de: 'de.aburidautsch',
  en: 'en.sahih',
  fr: 'fr.hamidullah',
  tr: 'tr.diyanet',
  id: 'id.indonesian',
  nl: 'nl.keyzer',
  bs: 'bs.mlivo',
  ur: 'ur.jalandhry',
  ms: 'ms.basmeih',
}

// ─── Hadith dataset editions (fawazahmed0 CDN) ────────────────────────────────

export const HADITH_EDITION: Partial<Record<LangCode, { edition: string; total: number }>> = {
  de: { edition: 'deu-abuhumaidariy',  total: 2647 },
  en: { edition: 'eng-bukhari',        total: 7563 },
  tr: { edition: 'tur-bukhari',        total: 7563 },
}
