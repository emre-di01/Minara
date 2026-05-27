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
  fr: { fajr: 'Fajr',    sunrise: 'Lever du soleil',dhuhr: 'Dohr',   asr: 'Asr',     maghrib: 'Maghrib', isha: 'Icha'     },
  nl: { fajr: 'Fajr',    sunrise: 'Zonsopgang',    dhuhr: 'Dohr',    asr: 'Asr',     maghrib: 'Maghrib', isha: 'Isha'     },
  bs: { fajr: 'Sabah',   sunrise: 'Izlazak',       dhuhr: 'Podne',   asr: 'Ikindija',maghrib: 'Akšam',   isha: 'Jacija'   },
  so: { fajr: 'Subax',   sunrise: 'Bax-qoraxo',    dhuhr: 'Duhr',    asr: 'Asr',     maghrib: 'Fiid',    isha: 'Cishe'    },
  ms: { fajr: 'Subuh',   sunrise: 'Syuruk',        dhuhr: 'Zuhur',   asr: 'Asar',    maghrib: 'Maghrib', isha: 'Isyak'    },
}

// ─── UI strings ───────────────────────────────────────────────────────────────
// Used across slides: prayer times, Quran, AsmaulHusna, Jumu'a, Ramadan, RSS

export interface UIStrings {
  // Prayer times slide
  next: string        // "Nächste" — label above countdown
  remaining: string   // "verbleibend" — unused currently, reserved
  prayer: string      // "Gebetszeiten" — fallback header

  // Quran slide
  surah: string       // "Sure" / "Surah" / "سورة"
  verse: string       // "Vers" / "Verse" / "آية"

  // AsmaulHusna slide: "{num} {of} 99"
  of: string          // "von" / "of" / "من"

  // Jumu'a slide
  today: string       // "Heute" / "Today" / "اليوم"
  nextFriday: string  // "Nächsten Freitag" / "Next Friday"
  nextWeek: string    // "Nächste Woche" / "Next week"
  in_: string         // "In" / "بعد" — countdown prefix
  timeSuffix: string  // " Uhr" (de) / "" (other) — appended to prayer time

  // Ramadan slide
  imsakIn: string     // "Imsak in" / "Suhoor in" / "الإمساك بعد"
  iftarIn: string     // "Iftar in" / "الإفطار بعد"
  iftarDone: string   // "Heute ✓" / "Done ✓"

  // RSS slide
  news: string        // "Neuigkeiten" / "News" / "أخبار"
}

export const UI: Record<LangCode, UIStrings> = {
  de: {
    next: 'Nächste',       remaining: 'verbleibend',     prayer: 'Gebetszeiten',
    surah: 'Sure',         verse: 'Vers',                of: 'von',
    today: 'Heute',        nextFriday: 'Nächsten Freitag', nextWeek: 'Nächste Woche',
    in_: 'In',             timeSuffix: ' Uhr',
    imsakIn: 'Imsak in',   iftarIn: 'Iftar in',          iftarDone: 'Heute ✓',
    news: 'Neuigkeiten',
  },
  en: {
    next: 'Next',          remaining: 'remaining',        prayer: 'Prayer Times',
    surah: 'Surah',        verse: 'Verse',               of: 'of',
    today: 'Today',        nextFriday: 'Next Friday',     nextWeek: 'Next week',
    in_: 'In',             timeSuffix: '',
    imsakIn: 'Suhoor in',  iftarIn: 'Iftar in',          iftarDone: 'Done ✓',
    news: 'News',
  },
  ar: {
    next: 'التالية',        remaining: 'متبقي',            prayer: 'أوقات الصلاة',
    surah: 'سورة',          verse: 'الآية',               of: 'من',
    today: 'اليوم',          nextFriday: 'الجمعة القادمة', nextWeek: 'الأسبوع القادم',
    in_: 'بعد',             timeSuffix: '',
    imsakIn: 'الإمساك بعد', iftarIn: 'الإفطار بعد',       iftarDone: 'اليوم ✓',
    news: 'أخبار',
  },
  tr: {
    next: 'Sonraki',       remaining: 'kalan',            prayer: 'Namaz Vakitleri',
    surah: 'Sure',         verse: 'Ayet',                of: '/',
    today: 'Bugün',        nextFriday: 'Gelecek Cuma',    nextWeek: 'Gelecek hafta',
    in_: 'Kalan',          timeSuffix: '',
    imsakIn: 'İmsak kalan',iftarIn: 'İftar kalan',        iftarDone: 'Bugün ✓',
    news: 'Haberler',
  },
  id: {
    next: 'Berikutnya',    remaining: 'tersisa',          prayer: 'Jadwal Shalat',
    surah: 'Surah',        verse: 'Ayat',                of: 'dari',
    today: 'Hari ini',     nextFriday: 'Jumat depan',     nextWeek: 'Minggu depan',
    in_: 'Dalam',          timeSuffix: '',
    imsakIn: 'Sahur dalam',iftarIn: 'Iftar dalam',        iftarDone: 'Selesai ✓',
    news: 'Berita',
  },
  bn: {
    next: 'পরবর্তী',        remaining: 'বাকি',             prayer: 'নামাজের সময়',
    surah: 'সূরা',          verse: 'আয়াত',               of: '/',
    today: 'আজ',            nextFriday: 'আগামী শুক্রবার',  nextWeek: 'আগামী সপ্তাহ',
    in_: 'পরে',             timeSuffix: '',
    imsakIn: 'সেহরির সময়', iftarIn: 'ইফতারের সময়',       iftarDone: 'আজ ✓',
    news: 'খবর',
  },
  ur: {
    next: 'اگلی',           remaining: 'باقی',             prayer: 'نماز کے اوقات',
    surah: 'سورۃ',          verse: 'آیت',                 of: '/',
    today: 'آج',            nextFriday: 'اگلے جمعہ',      nextWeek: 'اگلے ہفتے',
    in_: 'بعد',             timeSuffix: '',
    imsakIn: 'سحری میں',    iftarIn: 'افطار میں',          iftarDone: 'آج ✓',
    news: 'خبریں',
  },
  fr: {
    next: 'Prochain',      remaining: 'restant',          prayer: 'Horaires de prière',
    surah: 'Sourate',      verse: 'Verset',              of: 'sur',
    today: "Aujourd'hui",  nextFriday: 'Vendredi prochain', nextWeek: 'La semaine prochaine',
    in_: 'Dans',           timeSuffix: 'h',
    imsakIn: 'Suhour dans',iftarIn: 'Iftar dans',         iftarDone: 'Accompli ✓',
    news: 'Actualités',
  },
  nl: {
    next: 'Volgende',      remaining: 'resterend',        prayer: 'Gebedstijden',
    surah: 'Soera',        verse: 'Vers',                of: 'van',
    today: 'Vandaag',      nextFriday: 'Volgende vrijdag', nextWeek: 'Volgende week',
    in_: 'Over',           timeSuffix: ' uur',
    imsakIn: 'Suhoor over',iftarIn: 'Iftar over',         iftarDone: 'Vandaag ✓',
    news: 'Nieuws',
  },
  bs: {
    next: 'Sljedeći',      remaining: 'preostalo',        prayer: 'Vakat',
    surah: 'Sura',         verse: 'Ajet',                of: 'od',
    today: 'Danas',        nextFriday: 'Sljedeći petak',  nextWeek: 'Sljedeće sedmice',
    in_: 'Za',             timeSuffix: ' sati',
    imsakIn: 'Imsak za',   iftarIn: 'Iftar za',           iftarDone: 'Danas ✓',
    news: 'Vijesti',
  },
  so: {
    next: 'Xiga',          remaining: 'haray',            prayer: 'Waqtiyada Salaadda',
    surah: 'Suura',        verse: 'Aayad',               of: 'ka',
    today: 'Maanta',       nextFriday: 'Jimcihii soo socda', nextWeek: 'Usbuucii soo socda',
    in_: 'Gudaha',         timeSuffix: '',
    imsakIn: 'Suxuur gudaha', iftarIn: 'Iftar gudaha',    iftarDone: 'Maanta ✓',
    news: 'Warka',
  },
  ms: {
    next: 'Seterusnya',    remaining: 'berbaki',          prayer: 'Waktu Solat',
    surah: 'Surah',        verse: 'Ayat',                of: 'daripada',
    today: 'Hari ini',     nextFriday: 'Jumaat hadapan',  nextWeek: 'Minggu hadapan',
    in_: 'Dalam',          timeSuffix: '',
    imsakIn: 'Sahur dalam',iftarIn: 'Iftar dalam',        iftarDone: 'Selesai ✓',
    news: 'Berita',
  },
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
