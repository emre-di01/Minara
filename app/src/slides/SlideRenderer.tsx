import { useEffect, useState } from 'react'
import type { Slide, PrayerTheme } from '../types'
import type { LangCode } from '../lib/i18n'
import PrayerTimesSlide from './PrayerTimesSlide'

interface Props {
  slide: Slide
  cityId: number
}

export default function SlideRenderer({ slide, cityId }: Props) {
  const c = slide.config

  switch (slide.type) {
    case 'prayer_times':
      return (
        <PrayerTimesSlide
          cityId={cityId}
          prayerTheme={(c.prayerTheme as PrayerTheme) ?? 'madinah'}
          mosqueName={(c.mosqueName as string) ?? ''}
          mosqueAddress={(c.mosqueAddress as string) ?? ''}
          bgImage={(c.bgImage as string) ?? ''}
          ticker={(c.ticker as string) ?? ''}
          lang={(c.lang as LangCode) ?? 'de'}
          lang2={(c.lang2 as LangCode) || undefined}
        />
      )

    case 'media': {
      const url = (c.url as string) ?? ''
      if (!url) return <Placeholder label="Kein Bild / Video" />
      const isVideo = /\.(mp4|webm|ogg)$/i.test(url)
      return isVideo
        ? <video src={url} className="h-screen w-screen object-cover" autoPlay loop muted playsInline />
        : <img src={url} className="h-screen w-screen object-cover" alt="" />
    }

    case 'ticker': {
      const text = (c.text as string) ?? ''
      return (
        <div className="h-screen w-screen bg-gray-950 flex items-center overflow-hidden">
          <span
            className="whitespace-nowrap text-white text-4xl font-medium"
            style={{ animation: 'slide-ticker 30s linear infinite' }}
          >
            {text}
          </span>
          <style>{`@keyframes slide-ticker { from { transform: translateX(100vw) } to { transform: translateX(-100%) } }`}</style>
        </div>
      )
    }

    case 'rss': {
      const url = (c.url as string) ?? ''
      return <RssSlide url={url} />
    }

    case 'weather':
      return <WeatherSlide city={(c.city as string) ?? ''} />

    case 'hadith':
      return <HadithSlide />

    case 'quran':
      return <QuranSlide />

    case 'asmaul_husna':
      return <AsmaulHusnaSlide />

    default:
      return <Placeholder label="Unbekannter Slide-Typ" />
  }
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="h-screen w-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">
      {label}
    </div>
  )
}

interface RssItem {
  title: string
  description: string
  thumbnail?: string
  enclosure?: { url?: string; type?: string }
}

function extractImage(item: RssItem): string | null {
  if (item.thumbnail) return item.thumbnail
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) return item.enclosure.url
  // fallback: first <img> in description HTML
  const m = item.description?.match(/<img[^>]+src=["']([^"']+)["']/i)
  return m ? m[1] : null
}

function RssSlide({ url }: { url: string }) {
  const [items, setItems] = useState<RssItem[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!url) return
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'ok') setItems(d.items) })
      .catch(() => {})
  }, [url])

  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), 8000)
    return () => clearInterval(id)
  }, [items.length])

  if (!items.length) return <Placeholder label="RSS wird geladen..." />

  const item = items[idx]
  const image = extractImage(item)
  const plain = item.description?.replace(/<[^>]+>/g, '').trim() ?? ''

  return (
    <div className="h-screen w-screen bg-[#111] text-white overflow-hidden relative">
      {/* Background image blur */}
      {image && (
        <div className="absolute inset-0">
          <img src={image} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.92) 45%, rgba(0,0,0,0.4) 100%)' }} />
        </div>
      )}

      <div className="relative z-10 h-full flex items-center">
        {/* Text side */}
        <div className="flex flex-col gap-4 px-16 max-w-2xl">
          <div className="text-xs text-gray-400 uppercase tracking-widest">News</div>
          <div className="text-3xl font-bold leading-snug">{item.title}</div>
          {plain && <div className="text-base text-gray-300 line-clamp-4 leading-relaxed">{plain}</div>}
          {items.length > 1 && (
            <div className="flex gap-1.5 mt-2">
              {items.map((_, i) => (
                <div key={i} className="rounded-full transition-all"
                  style={{ width: i === idx ? 20 : 6, height: 6, background: i === idx ? 'white' : 'rgba(255,255,255,0.25)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Image side (only when image exists and no bg blur) */}
        {image && (
          <div className="ml-auto mr-16 shrink-0 hidden lg:block">
            <img src={image} className="rounded-2xl object-cover shadow-2xl"
              style={{ width: 380, height: 260 }} alt="" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Weather ──────────────────────────────────────────────────────────────────

const WMO_DESC: Record<number, string> = {
  0: 'Klar', 1: 'Meist klar', 2: 'Teils bewölkt', 3: 'Bewölkt',
  45: 'Nebel', 48: 'Nebel', 51: 'Niesel', 53: 'Niesel', 55: 'Starker Niesel',
  61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
  71: 'Schneeregen', 73: 'Schnee', 75: 'Starker Schnee',
  80: 'Schauer', 81: 'Schauer', 82: 'Starke Schauer', 95: 'Gewitter',
}
const WMO_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌦️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️', 95: '⛈️',
}

function WeatherSlide({ city }: { city: string }) {
  const [data, setData] = useState<{ temp: number; code: number; name: string } | null>(null)

  useEffect(() => {
    if (!city) return
    async function load() {
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`).then(r => r.json())
      if (!geo.results?.length) return
      const { latitude, longitude, name } = geo.results[0]
      const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`).then(r => r.json())
      setData({ temp: Math.round(w.current_weather.temperature), code: w.current_weather.weathercode, name })
    }
    load()
    const id = setInterval(load, 10 * 60_000)
    return () => clearInterval(id)
  }, [city])

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2c40 50%, #0d1b2a 100%)' }}>
      <div style={{ fontSize: '8rem', lineHeight: 1 }}>{data ? WMO_EMOJI[data.code] ?? '🌡️' : '…'}</div>
      {data ? (
        <>
          <div className="font-thin text-white" style={{ fontSize: 'clamp(5rem, 14vw, 10rem)', lineHeight: 1 }}>
            {data.temp}°
          </div>
          <div className="text-2xl text-white/70">{WMO_DESC[data.code] ?? ''}</div>
          <div className="text-lg text-white/40 uppercase tracking-widest">{data.name}</div>
        </>
      ) : (
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      )}
    </div>
  )
}

// ─── Hadith ───────────────────────────────────────────────────────────────────

interface HadithData { text: string; book: string; number: number }

function HadithSlide() {
  const [hadith, setHadith] = useState<HadithData | null>(null)

  useEffect(() => {
    // Free static hadith dataset (German) via jsDelivr CDN
    const TOTAL = 2647
    const num = Math.floor(Math.random() * TOTAL) + 1
    fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/deu-abuhumaidariy/${num}.json`)
      .then(r => r.json())
      .then(d => setHadith({ text: d.hadith[0]?.text ?? '', book: 'Sahih Bukhari', number: num }))
      .catch(() => {})
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-16 gap-8"
      style={{ background: 'linear-gradient(160deg, #0a0a0a 0%, #0f1a0f 100%)' }}>
      <div className="text-amber-400/60 text-4xl">☽</div>
      <div className="text-xs text-amber-400/50 uppercase tracking-widest">Hadith</div>
      {hadith ? (
        <>
          <p className="text-white/90 text-xl leading-relaxed text-center max-w-3xl font-light">
            „{hadith.text}"
          </p>
          <div className="text-white/30 text-sm">{hadith.book} · Nr. {hadith.number}</div>
        </>
      ) : (
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      )}
    </div>
  )
}

// ─── Quran-Vers ───────────────────────────────────────────────────────────────

interface AyahData { arabic: string; german: string; surah: string; ayah: number }

function QuranSlide() {
  const [ayah, setAyah] = useState<AyahData | null>(null)

  useEffect(() => {
    // Random ayah with German translation (de.aburidautsch)
    const randomRef = Math.floor(Math.random() * 6236) + 1
    fetch(`https://api.alquran.cloud/v1/ayah/${randomRef}/editions/quran-simple,de.aburidautsch`)
      .then(r => r.json())
      .then(d => {
        if (d.code !== 200) return
        const [arabic, german] = d.data
        setAyah({
          arabic: arabic.text,
          german: german.text,
          surah: arabic.surah.englishName,
          ayah: arabic.numberInSurah,
        })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-16 gap-8"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a0a2e 0%, #070010 100%)' }}>
      <div className="text-purple-400/50 text-xs uppercase tracking-widest">Quran</div>
      {ayah ? (
        <>
          <p className="text-white text-4xl text-center leading-loose font-light"
            style={{ fontFamily: '"Amiri", "Traditional Arabic", serif', direction: 'rtl' }}>
            {ayah.arabic}
          </p>
          <div className="w-16 h-px bg-white/10" />
          <p className="text-white/60 text-lg text-center max-w-2xl leading-relaxed font-light italic">
            „{ayah.german}"
          </p>
          <div className="text-white/25 text-sm">Sure {ayah.surah} · Vers {ayah.ayah}</div>
        </>
      ) : (
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      )}
    </div>
  )
}

// ─── Asmaul Husna ─────────────────────────────────────────────────────────────

const ASMAUL_HUSNA = [
  ['الرَّحْمَنُ', 'Ar-Rahman', 'Der Allerbarmer'],
  ['الرَّحِيمُ', 'Ar-Rahim', 'Der Barmherzige'],
  ['الْمَلِكُ', 'Al-Malik', 'Der König'],
  ['الْقُدُّوسُ', 'Al-Quddus', 'Der Heilige'],
  ['السَّلَامُ', 'As-Salam', 'Der Friede'],
  ['الْمُؤْمِنُ', 'Al-Mumin', 'Der Gläubige'],
  ['الْمُهَيْمِنُ', 'Al-Muhaymin', 'Der Wächter'],
  ['الْعَزِيزُ', 'Al-Aziz', 'Der Mächtige'],
  ['الْجَبَّارُ', 'Al-Jabbar', 'Der Gewaltige'],
  ['الْمُتَكَبِّرُ', 'Al-Mutakabbir', 'Der Erhabene'],
  ['الْخَالِقُ', 'Al-Khaliq', 'Der Schöpfer'],
  ['الْبَارِئُ', 'Al-Bari', 'Der Gestalter'],
  ['الْمُصَوِّرُ', 'Al-Musawwir', 'Der Bildner'],
  ['الْغَفَّارُ', 'Al-Ghaffar', 'Der Allverzeihende'],
  ['الْقَهَّارُ', 'Al-Qahhar', 'Der Bezwinger'],
  ['الْوَهَّابُ', 'Al-Wahhab', 'Der Schenkende'],
  ['الرَّزَّاقُ', 'Ar-Razzaq', 'Der Versorger'],
  ['الْفَتَّاحُ', 'Al-Fattah', 'Der Öffner'],
  ['الْعَلِيمُ', 'Al-Alim', 'Der Allwissende'],
  ['الْقَابِضُ', 'Al-Qabid', 'Der Zurückhaltende'],
  ['الْبَاسِطُ', 'Al-Basit', 'Der Ausbreitende'],
  ['الْخَافِضُ', 'Al-Khafid', 'Der Erniedrigende'],
  ['الرَّافِعُ', 'Ar-Rafi', 'Der Erhöhende'],
  ['الْمُعِزُّ', 'Al-Muizz', 'Der Ehrende'],
  ['الْمُذِلُّ', 'Al-Mudhill', 'Der Demütigende'],
  ['السَّمِيعُ', 'As-Sami', 'Der Allhörende'],
  ['الْبَصِيرُ', 'Al-Basir', 'Der Allsehende'],
  ['الْحَكَمُ', 'Al-Hakam', 'Der Richter'],
  ['الْعَدْلُ', 'Al-Adl', 'Der Gerechte'],
  ['اللَّطِيفُ', 'Al-Latif', 'Der Feinfühlige'],
  ['الْخَبِيرُ', 'Al-Khabir', 'Der Allkundige'],
  ['الْحَلِيمُ', 'Al-Halim', 'Der Nachsichtige'],
  ['الْعَظِيمُ', 'Al-Azim', 'Der Großartige'],
  ['الْغَفُورُ', 'Al-Ghafur', 'Der Allverzeihende'],
  ['الشَّكُورُ', 'Ash-Shakur', 'Der Dankbare'],
  ['الْعَلِيُّ', 'Al-Ali', 'Der Hohe'],
  ['الْكَبِيرُ', 'Al-Kabir', 'Der Große'],
  ['الْحَفِيظُ', 'Al-Hafiz', 'Der Bewahrende'],
  ['الْمُقِيتُ', 'Al-Muqit', 'Der Ernährer'],
  ['الْحَسِيبُ', 'Al-Hasib', 'Der Abrechnende'],
  ['الْجَلِيلُ', 'Al-Jalil', 'Der Majestätische'],
  ['الْكَرِيمُ', 'Al-Karim', 'Der Großzügige'],
  ['الرَّقِيبُ', 'Ar-Raqib', 'Der Wachsame'],
  ['الْمُجِيبُ', 'Al-Mujib', 'Der Erhörende'],
  ['الْوَاسِعُ', 'Al-Wasi', 'Der Weitreichende'],
  ['الْحَكِيمُ', 'Al-Hakim', 'Der Allweise'],
  ['الْوَدُودُ', 'Al-Wadud', 'Der Liebevolle'],
  ['الْمَجِيدُ', 'Al-Majid', 'Der Ruhmreiche'],
  ['الْبَاعِثُ', 'Al-Baith', 'Der Auferweckende'],
  ['الشَّهِيدُ', 'Ash-Shahid', 'Der Zeuge'],
  ['الْحَقُّ', 'Al-Haqq', 'Die Wahrheit'],
  ['الْوَكِيلُ', 'Al-Wakil', 'Der Treuhänder'],
  ['الْقَوِيُّ', 'Al-Qawi', 'Der Starke'],
  ['الْمَتِينُ', 'Al-Matin', 'Der Standfeste'],
  ['الْوَلِيُّ', 'Al-Wali', 'Der Beschützer'],
  ['الْحَمِيدُ', 'Al-Hamid', 'Der Gelobte'],
  ['الْمُحْصِي', 'Al-Muhsi', 'Der Zähler'],
  ['الْمُبْدِئُ', 'Al-Mubdi', 'Der Ursprung'],
  ['الْمُعِيدُ', 'Al-Muid', 'Der Wiederbringer'],
  ['الْمُحْيِي', 'Al-Muhyi', 'Der Lebenspendende'],
  ['الْمُمِيتُ', 'Al-Mumit', 'Der Todesbringende'],
  ['الْحَيُّ', 'Al-Hayy', 'Der Lebendige'],
  ['الْقَيُّومُ', 'Al-Qayyum', 'Der Beständige'],
  ['الْوَاجِدُ', 'Al-Wajid', 'Der Findende'],
  ['الْمَاجِدُ', 'Al-Majid', 'Der Edle'],
  ['الْوَاحِدُ', 'Al-Wahid', 'Der Einzige'],
  ['الْأَحَدُ', 'Al-Ahad', 'Der Eine'],
  ['الصَّمَدُ', 'As-Samad', 'Der Ewige'],
  ['الْقَادِرُ', 'Al-Qadir', 'Der Fähige'],
  ['الْمُقْتَدِرُ', 'Al-Muqtadir', 'Der Allmächtige'],
  ['الْمُقَدِّمُ', 'Al-Muqaddim', 'Der Vorrückende'],
  ['الْمُؤَخِّرُ', 'Al-Muakhkhir', 'Der Zurückstellende'],
  ['الْأَوَّلُ', 'Al-Awwal', 'Der Erste'],
  ['الْآخِرُ', 'Al-Akhir', 'Der Letzte'],
  ['الظَّاهِرُ', 'Az-Zahir', 'Der Offenbare'],
  ['الْبَاطِنُ', 'Al-Batin', 'Der Verborgene'],
  ['الْوَالِي', 'Al-Wali', 'Der Regierende'],
  ['الْمُتَعَالِي', 'Al-Mutaali', 'Der Allerhöchste'],
  ['الْبَرُّ', 'Al-Barr', 'Der Gütige'],
  ['التَّوَّابُ', 'At-Tawwab', 'Der Vergebende'],
  ['الْمُنْتَقِمُ', 'Al-Muntaqim', 'Der Rächende'],
  ['الْعَفُوُّ', 'Al-Afuww', 'Der Verzeihende'],
  ['الرَّؤُوفُ', 'Ar-Rauf', 'Der Mitfühlende'],
  ['مَالِكُ الْمُلْكِ', 'Malik-ul-Mulk', 'Herr des Reiches'],
  ['ذُو الْجَلَالِ', 'Dhul-Jalali', 'Herr der Majestät'],
  ['الْمُقْسِطُ', 'Al-Muqsit', 'Der Gerechte'],
  ['الْجَامِعُ', 'Al-Jami', 'Der Vereinende'],
  ['الْغَنِيُّ', 'Al-Ghani', 'Der Reiche'],
  ['الْمُغْنِي', 'Al-Mughni', 'Der Bereichernde'],
  ['الْمَانِعُ', 'Al-Mani', 'Der Verhindernde'],
  ['الضَّارُّ', 'Ad-Darr', 'Der Schadensbringende'],
  ['النَّافِعُ', 'An-Nafi', 'Der Nutzenbringende'],
  ['النُّورُ', 'An-Nur', 'Das Licht'],
  ['الْهَادِي', 'Al-Hadi', 'Der Führende'],
  ['الْبَدِيعُ', 'Al-Badi', 'Der Schöpfer'],
  ['الْبَاقِي', 'Al-Baqi', 'Der Bleibende'],
  ['الْوَارِثُ', 'Al-Warith', 'Der Erbe'],
  ['الرَّشِيدُ', 'Ar-Rashid', 'Der Rechtgeleitete'],
  ['الصَّبُورُ', 'As-Sabur', 'Der Geduldige'],
]

function AsmaulHusnaSlide() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * ASMAUL_HUSNA.length))

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % ASMAUL_HUSNA.length), 8000)
    return () => clearInterval(id)
  }, [])

  const [arabic, transliteration, german] = ASMAUL_HUSNA[idx]
  const num = idx + 1

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #1c1400 0%, #080600 100%)' }}>
      <div className="text-amber-400/30 text-xs uppercase tracking-widest">Asmaul Husna · {num} von 99</div>
      <div className="text-white font-light text-center"
        style={{ fontSize: 'clamp(4rem, 12vw, 8rem)', fontFamily: '"Amiri", "Traditional Arabic", serif', lineHeight: 1.2 }}>
        {arabic}
      </div>
      <div className="text-amber-300 text-2xl font-light tracking-wide">{transliteration}</div>
      <div className="text-white/50 text-xl">{german}</div>
      <div className="flex gap-1.5 mt-4">
        {ASMAUL_HUSNA.map((_, i) => (
          <div key={i} className="rounded-full transition-all"
            style={{ width: i === idx ? 16 : 3, height: 3, background: i === idx ? '#d4a843' : 'rgba(255,255,255,0.15)' }} />
        ))}
      </div>
    </div>
  )
}
