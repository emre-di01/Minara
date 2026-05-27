// ─── CMS i18n ────────────────────────────────────────────────────────────────
// 7 UI languages for the admin dashboard (separate from screen-side i18n.ts)

export type CmsLang = 'de' | 'en' | 'tr' | 'ar' | 'fr' | 'nl' | 'bs'

export const CMS_LANGUAGES: { code: CmsLang; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'bs', label: 'Bosanski' },
]

// Template helper: tpl('{{n}} Slides', 3) → '3 Slides'
export function tpl(template: string, n: number | string): string {
  return template.replace(/\{\{n\}\}/g, String(n))
}

// Named template: tplNamed('Delete {{name}}?', { name: 'Ramadan' }) → 'Delete Ramadan?'
export function tplNamed(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v), template)
}

// ─── Type definition ─────────────────────────────────────────────────────────

type OptMap = Record<string, { label?: string; desc?: string }>

export interface CmsStrings {
  nav: {
    dashboard: string; screens: string; playlists: string; settings: string; media: string
    signOut: string
    mStart: string; mContent: string; mProfile: string
  }
  dash: {
    manage: string; planContent: string; imagesVideos: string; profileLogo: string
  }
  pl: {
    title: string; new_: string; namePh: string; create: string
    slideCount: string   // template: '{{n}} Slides'
    none: string; noneHint: string; createFirst: string
    deleteTitle: string; confirmDelete: string; cancel: string
  }
  sc: {
    title: string; add: string; namePh: string; save: string; cancel: string
    pair: string; pairTitle: string; pairingCode: string; codePh: string
    assign: string; choosePlaylist: string; noPlaylist: string
    online: string; offline: string
    city: string; addCity: string; changeCity: string; noPrayerCity: string
    deleteTitle: string; confirmDelete: string; allScreens: string
    errName: string; errCode: string; errPair: string; errNotFound: string  // errNotFound: template {{code}}
    noScreens: string; noScreensHint: string
    schedule: string; closeSchedule: string; scheduleRules: string  // template {{n}}
    noSchedule: string; noRules: string; addRule: string; ruleLabel: string  // template {n}
    days: string[]     // ['So','Mo','Di','Mi','Do','Fr','Sa']
    from: string; to: string
  }
  st: {
    title: string; mosqueName: string; address: string; logo: string
    uploadLogo: string; removeLogo: string; uploading: string
    prayerSource: string; addCity: string; changeCity: string; noCity: string
    errName: string; errUpload: string
    save: string; saving: string; saved: string
  }
  pb: {
    back: string; save: string; saving: string; loading: string; selectSlide: string
    tabSlides: string; tabSettings: string
    addSlide: string; noSlides: string; remove: string; change: string; set: string
    duration: string; durationHint: string; design: string
    lang: string; lang2: string; noLang2: string; translLang: string; meaningLang: string
    transFade: string; transSlide: string; transZoom: string; transCut: string; transitionLabel: string
    tickerOverlay: string; tickerMsgPh: string; addMsg: string
    speed: string; fast: string; slow: string
    dark: string; gold: string; green: string; light: string
    color: string; text: string; clock: string; clockHide: string
    bgImg: string; caption: string; captionPh: string; mediaUrl: string
    city: string; prayerSource: string; prayerSourceCalc: string; prayerSourceHint: string
    mosqueAddr: string; mosqueName: string; mosqueLogo: string; mosqueLogoHint: string
    offsetsTitle: string; offsetsHint: string
    rssFeedUrl: string; rssLang: string
    hadithSrc: string
    asmaulDesc: string
    evList: string; evAdd: string; evRemove: string; evTitle: string; evTitlePh: string
    evDate: string; evTime: string; evDisplay: string; evLang: string
    donCurrent: string; donGoal: string; donCurrency: string; donDesc: string
    donDescription: string; donLink: string; donSubtitle: string
    channels: string; channelN: string; chHandlePh: string; chAdd: string; chRemove: string
    igToken: string; igStep1: string; igStep2: string; igStep3: string; igStep4: string; igStep5: string
    igHowTo: string; igManualOr: string; igManualHint: string
    igAddPost: string; igPostN: string; igImageUrlPh: string; igCaptionPh: string; igHandlePh: string; igAlt: string
    ramLang: string; ramDesc: string; ramNote: string
    jumuTime: string; jumuDesc: string
    tickerField: string
    file_: string; uploading: string; lib: string; libTitle: string; libEmpty: string
    aiTitle: string; aiPromptPh: string; aiTemplates: string; aiGenerate: string
    aiGenerating: string; aiLandscape: string; aiPortrait: string; aiUse: string
    aiBtn: string; aiAgain: string
    types: Record<string, string>
    opts: {
      prayer?:   OptMap
      media?:    OptMap
      ticker?:   OptMap
      rss?:      OptMap
      weather?:  OptMap
      hadith?:   OptMap
      quran?:    OptMap
      asmaul?:   OptMap
      events?:   OptMap
      donation?: OptMap
      social?:   OptMap
      ramadan?:  OptMap
      jumua?:    OptMap
    }
  }
}

// ─── Translations ─────────────────────────────────────────────────────────────

export const CMS: Record<CmsLang, CmsStrings> = {

  // ── Deutsch ────────────────────────────────────────────────────────────────
  de: {
    nav: {
      dashboard:'Dashboard', screens:'Screens', playlists:'Playlists', settings:'Einstellungen', media:'Mediathek',
      signOut:'Abmelden', mStart:'Start', mContent:'Inhalte', mProfile:'Profil',
    },
    dash: {
      manage:'Verwalte deine TV-Screens und Playlists.',
      planContent:'Plane deine Inhalte mit Slides — Gebetszeiten, Bilder, Lauftexte und mehr.',
      imagesVideos:'Bilder & Videos verwalten und in Slides einbinden.',
      profileLogo:'Moschee-Name, Adresse und Logo für Slides.',
    },
    pl: {
      title:'Playlists', new_:'Neue Playlist', namePh:'Playlist-Name',
      create:'Erstellen', slideCount:'{{n}} Slides',
      none:'Keine Playlists', noneHint:'Erstelle deine erste Playlist.',
      createFirst:'Erste Playlist erstellen',
      deleteTitle:'Playlist löschen',
      confirmDelete:'Playlist „{{name}}" wirklich löschen?', cancel:'Abbrechen',
    },
    sc: {
      title:'Screens', add:'Screen hinzufügen', namePh:'Screen-Name',
      save:'Speichern', cancel:'Abbrechen',
      pair:'Koppeln', pairTitle:'Screen koppeln', pairingCode:'Kopplungs-Code',
      codePh:'6-stelligen Code eingeben',
      assign:'Zuweisen', choosePlaylist:'Playlist wählen…', noPlaylist:'Keine Playlist',
      online:'Online', offline:'Offline',
      city:'Stadt', addCity:'Stadt hinzufügen', changeCity:'Stadt ändern', noPrayerCity:'Keine Stadt',
      deleteTitle:'Screen löschen', confirmDelete:'Screen „{{name}}" wirklich löschen?',
      allScreens:'Alle Screens',
      errName:'Name erforderlich', errCode:'Code ungültig', errPair:'Kopplung fehlgeschlagen',
      errNotFound:'Code {{code}} nicht gefunden.',
      noScreens:'Keine Screens', noScreensHint:'Füge deinen ersten Screen hinzu.',
      schedule:'Zeitplan', closeSchedule:'Schließen',
      scheduleRules:'{{n}} Regeln', noSchedule:'Kein Zeitplan',
      noRules:'Keine Regeln', addRule:'Regel hinzufügen', ruleLabel:'Regel {n}',
      days:['So','Mo','Di','Mi','Do','Fr','Sa'],
      from:'Von', to:'Bis',
    },
    st: {
      title:'Einstellungen', mosqueName:'Moschee-Name', address:'Adresse', logo:'Logo',
      uploadLogo:'Logo hochladen', removeLogo:'Entfernen', uploading:'Lädt…',
      prayerSource:'Gebetszeiten-Quelle', addCity:'Stadt hinzufügen',
      changeCity:'Stadt ändern', noCity:'Keine Stadt gewählt',
      errName:'Name erforderlich', errUpload:'Upload fehlgeschlagen',
      save:'Speichern', saving:'Speichert…', saved:'Gespeichert',
    },
    pb: {
      back:'Playlists', save:'Speichern', saving:'Speichert…', loading:'Lade…',
      selectSlide:'Slide auswählen um ihn zu bearbeiten.',
      tabSlides:'Slides', tabSettings:'Einstellungen',
      addSlide:'Slide hinzufügen', noSlides:'Keine Slides',
      remove:'Entfernen', change:'Ändern', set:'Setzen',
      duration:'Anzeigedauer', durationHint:'Sekunden (0 = unbegrenzt)',
      design:'Design', lang:'Sprache', lang2:'2. Sprache', noLang2:'Keine',
      translLang:'Übersetzungssprache', meaningLang:'Bedeutungssprache',
      transFade:'Blend', transSlide:'Slide', transZoom:'Zoom', transCut:'Schnitt',
      transitionLabel:'Übergang',
      tickerOverlay:'Laufschrift', tickerMsgPh:'Nachricht…', addMsg:'Nachricht hinzufügen',
      speed:'Geschwindigkeit', fast:'Schnell', slow:'Langsam',
      dark:'Dunkel', gold:'Gold', green:'Grün', light:'Hell',
      color:'Farbe', text:'Text', clock:'Uhr', clockHide:'Uhr ausblenden',
      bgImg:'Hintergrundbild', caption:'Beschriftung', captionPh:'Beschriftung…',
      mediaUrl:'Bild- oder Video-URL',
      city:'Stadt', prayerSource:'Gebetszeiten-Quelle',
      prayerSourceCalc:'Berechnet (GPS)',
      prayerSourceHint:'Gebetszeiten aus den Moschee-Einstellungen',
      mosqueAddr:'Moschee-Adresse', mosqueName:'Moschee-Name',
      mosqueLogo:'Moschee-Logo', mosqueLogoHint:'Aus Einstellungen',
      offsetsTitle:'Zeitkorrekturen (Minuten)',
      offsetsHint:'Positive oder negative Minuten pro Gebet',
      rssFeedUrl:'RSS Feed URL', rssLang:'Sprache',
      hadithSrc:'Hadith-Quelle',
      asmaulDesc:'Die 99 schönen Namen Allahs',
      evList:'Veranstaltungen', evAdd:'Hinzufügen', evRemove:'Entfernen',
      evTitle:'Titel', evTitlePh:'Veranstaltungstitel…',
      evDate:'Datum', evTime:'Uhrzeit', evDisplay:'Anzeige', evLang:'Sprache',
      donCurrent:'Aktueller Betrag', donGoal:'Ziel', donCurrency:'Währung',
      donDesc:'Beschreibung', donDescription:'Beschreibung…',
      donLink:'Link', donSubtitle:'Untertitel',
      channels:'Kanäle', channelN:'Kanal {{n}}', chHandlePh:'@handle',
      chAdd:'Kanal hinzufügen', chRemove:'Entfernen',
      igToken:'Access Token', igStep1:'Schritt 1: Facebook Developer App erstellen',
      igStep2:'Schritt 2: Instagram Basic Display API aktivieren',
      igStep3:'Schritt 3: Test-User hinzufügen',
      igStep4:'Schritt 4: Access Token generieren',
      igStep5:'Schritt 5: Token hier eintragen',
      igHowTo:'Anleitung (öffnet Facebook Docs)',
      igManualOr:'Oder manuell eingeben:',
      igManualHint:'Bilder direkt als URL + Beschriftung hinzufügen',
      igAddPost:'Beitrag hinzufügen', igPostN:'Beitrag {{n}}',
      igImageUrlPh:'Bild-URL…', igCaptionPh:'Beschriftung…',
      igHandlePh:'@instagram', igAlt:'Alternativtext',
      ramLang:'Sprache', ramDesc:'Ramadan Mubarak',
      ramNote:'Datum und Gebetszeiten kommen aus den Einstellungen',
      jumuTime:'Uhrzeit', jumuDesc:'Jumu\'a Beschreibung',
      tickerField:'Laufschrift-Text',
      file_:'Datei', uploading:'Lädt…', lib:'Mediathek',
      libTitle:'Aus Mediathek wählen', libEmpty:'Noch keine Dateien in der Mediathek.',
      aiTitle:'KI-Bild generieren', aiPromptPh:'Beschreibe das Bild…',
      aiTemplates:'Vorlagen', aiGenerate:'Generieren',
      aiGenerating:'Generiert…', aiLandscape:'16:9', aiPortrait:'9:16',
      aiUse:'Verwenden', aiBtn:'KI-Bild', aiAgain:'Neu generieren',
      types: {
        prayer_times:'Gebetszeiten', media:'Bild / Video', ticker:'Lauftext',
        rss:'RSS Feed', weather:'Wetter', hadith:'Hadith', quran:'Quran-Vers',
        asmaul_husna:'Asmaul Husna', events:'Veranstaltungen', donation:'Spendenaufruf',
        social_follow:'Social Media', instagram_feed:'Instagram Feed',
        ramadan:'Ramadan', jumu_a:"Jumu'a · Freitag",
      },
      opts: {},
    },
  },

  // ── English ─────────────────────────────────────────────────────────────────
  en: {
    nav: {
      dashboard:'Dashboard', screens:'Screens', playlists:'Playlists', settings:'Settings', media:'Media Library',
      signOut:'Sign Out', mStart:'Start', mContent:'Content', mProfile:'Profile',
    },
    dash: {
      manage:'Manage your TV screens and playlists.',
      planContent:'Plan your content with slides — prayer times, images, tickers and more.',
      imagesVideos:'Manage images & videos and embed them in slides.',
      profileLogo:'Mosque name, address and logo for slides.',
    },
    pl: {
      title:'Playlists', new_:'New Playlist', namePh:'Playlist name',
      create:'Create', slideCount:'{{n}} slides',
      none:'No Playlists', noneHint:'Create your first playlist.',
      createFirst:'Create first playlist',
      deleteTitle:'Delete Playlist',
      confirmDelete:'Really delete playlist "{{name}}"?', cancel:'Cancel',
    },
    sc: {
      title:'Screens', add:'Add Screen', namePh:'Screen name',
      save:'Save', cancel:'Cancel',
      pair:'Pair', pairTitle:'Pair Screen', pairingCode:'Pairing Code',
      codePh:'Enter 6-digit code',
      assign:'Assign', choosePlaylist:'Choose playlist…', noPlaylist:'No Playlist',
      online:'Online', offline:'Offline',
      city:'City', addCity:'Add city', changeCity:'Change city', noPrayerCity:'No city',
      deleteTitle:'Delete Screen', confirmDelete:'Really delete screen "{{name}}"?',
      allScreens:'All Screens',
      errName:'Name required', errCode:'Invalid code', errPair:'Pairing failed',
      errNotFound:'Code {{code}} not found.',
      noScreens:'No Screens', noScreensHint:'Add your first screen.',
      schedule:'Schedule', closeSchedule:'Close',
      scheduleRules:'{{n}} rules', noSchedule:'No schedule',
      noRules:'No rules', addRule:'Add rule', ruleLabel:'Rule {n}',
      days:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      from:'From', to:'To',
    },
    st: {
      title:'Settings', mosqueName:'Mosque Name', address:'Address', logo:'Logo',
      uploadLogo:'Upload Logo', removeLogo:'Remove', uploading:'Uploading…',
      prayerSource:'Prayer Times Source', addCity:'Add city',
      changeCity:'Change city', noCity:'No city selected',
      errName:'Name required', errUpload:'Upload failed',
      save:'Save', saving:'Saving…', saved:'Saved',
    },
    pb: {
      back:'Playlists', save:'Save', saving:'Saving…', loading:'Loading…',
      selectSlide:'Select a slide to edit it.',
      tabSlides:'Slides', tabSettings:'Settings',
      addSlide:'Add Slide', noSlides:'No Slides',
      remove:'Remove', change:'Change', set:'Set',
      duration:'Display Duration', durationHint:'Seconds (0 = unlimited)',
      design:'Design', lang:'Language', lang2:'2nd Language', noLang2:'None',
      translLang:'Translation language', meaningLang:'Meaning language',
      transFade:'Fade', transSlide:'Slide', transZoom:'Zoom', transCut:'Cut',
      transitionLabel:'Transition',
      tickerOverlay:'Ticker bar', tickerMsgPh:'Message…', addMsg:'Add message',
      speed:'Speed', fast:'Fast', slow:'Slow',
      dark:'Dark', gold:'Gold', green:'Green', light:'Light',
      color:'Color', text:'Text', clock:'Clock', clockHide:'Hide clock',
      bgImg:'Background image', caption:'Caption', captionPh:'Caption…',
      mediaUrl:'Image or video URL',
      city:'City', prayerSource:'Prayer Times Source',
      prayerSourceCalc:'Calculated (GPS)',
      prayerSourceHint:'Prayer times from mosque settings',
      mosqueAddr:'Mosque Address', mosqueName:'Mosque Name',
      mosqueLogo:'Mosque Logo', mosqueLogoHint:'From settings',
      offsetsTitle:'Time corrections (minutes)',
      offsetsHint:'Positive or negative minutes per prayer',
      rssFeedUrl:'RSS Feed URL', rssLang:'Language',
      hadithSrc:'Hadith source',
      asmaulDesc:'The 99 beautiful names of Allah',
      evList:'Events', evAdd:'Add', evRemove:'Remove',
      evTitle:'Title', evTitlePh:'Event title…',
      evDate:'Date', evTime:'Time', evDisplay:'Display', evLang:'Language',
      donCurrent:'Current amount', donGoal:'Goal', donCurrency:'Currency',
      donDesc:'Description', donDescription:'Description…',
      donLink:'Link', donSubtitle:'Subtitle',
      channels:'Channels', channelN:'Channel {{n}}', chHandlePh:'@handle',
      chAdd:'Add channel', chRemove:'Remove',
      igToken:'Access Token', igStep1:'Step 1: Create Facebook Developer App',
      igStep2:'Step 2: Enable Instagram Basic Display API',
      igStep3:'Step 3: Add test user',
      igStep4:'Step 4: Generate access token',
      igStep5:'Step 5: Enter token here',
      igHowTo:'Guide (opens Facebook Docs)',
      igManualOr:'Or add manually:',
      igManualHint:'Add images directly as URL + caption',
      igAddPost:'Add post', igPostN:'Post {{n}}',
      igImageUrlPh:'Image URL…', igCaptionPh:'Caption…',
      igHandlePh:'@instagram', igAlt:'Alt text',
      ramLang:'Language', ramDesc:'Ramadan Mubarak',
      ramNote:'Date and prayer times come from settings',
      jumuTime:'Time', jumuDesc:"Jumu'a Description",
      tickerField:'Ticker text',
      file_:'File', uploading:'Uploading…', lib:'Media Library',
      libTitle:'Choose from Media Library', libEmpty:'No files in the media library yet.',
      aiTitle:'Generate AI Image', aiPromptPh:'Describe the image…',
      aiTemplates:'Templates', aiGenerate:'Generate',
      aiGenerating:'Generating…', aiLandscape:'16:9', aiPortrait:'9:16',
      aiUse:'Use', aiBtn:'AI Image', aiAgain:'Regenerate',
      types: {
        prayer_times:'Prayer Times', media:'Image / Video', ticker:'Ticker',
        rss:'RSS Feed', weather:'Weather', hadith:'Hadith', quran:'Quran Verse',
        asmaul_husna:'Asmaul Husna', events:'Events', donation:'Donation',
        social_follow:'Social Media', instagram_feed:'Instagram Feed',
        ramadan:'Ramadan', jumu_a:"Jumu'a · Friday",
      },
      opts: {},
    },
  },

  // ── Türkçe ──────────────────────────────────────────────────────────────────
  tr: {
    nav: {
      dashboard:'Panel', screens:'Ekranlar', playlists:'Oynatma Listeleri', settings:'Ayarlar', media:'Medya Kütüphanesi',
      signOut:'Çıkış Yap', mStart:'Başlangıç', mContent:'İçerik', mProfile:'Profil',
    },
    dash: {
      manage:'TV ekranlarını ve oynatma listelerini yönet.',
      planContent:'Slaytlarla içerik planla — namaz vakitleri, görseller, yazılar ve daha fazlası.',
      imagesVideos:'Görselleri ve videoları yönet ve slaytlara ekle.',
      profileLogo:'Slaytlar için cami adı, adresi ve logosu.',
    },
    pl: {
      title:'Oynatma Listeleri', new_:'Yeni Liste', namePh:'Liste adı',
      create:'Oluştur', slideCount:'{{n}} slayt',
      none:'Liste Yok', noneHint:'İlk oynatma listeni oluştur.',
      createFirst:'İlk listeyi oluştur',
      deleteTitle:'Listeyi Sil',
      confirmDelete:'"{{name}}" listesi silinsin mi?', cancel:'İptal',
    },
    sc: {
      title:'Ekranlar', add:'Ekran Ekle', namePh:'Ekran adı',
      save:'Kaydet', cancel:'İptal',
      pair:'Eşleştir', pairTitle:'Ekranı Eşleştir', pairingCode:'Eşleştirme Kodu',
      codePh:'6 haneli kodu girin',
      assign:'Ata', choosePlaylist:'Liste seç…', noPlaylist:'Liste Yok',
      online:'Çevrimiçi', offline:'Çevrimdışı',
      city:'Şehir', addCity:'Şehir ekle', changeCity:'Şehir değiştir', noPrayerCity:'Şehir yok',
      deleteTitle:'Ekranı Sil', confirmDelete:'"{{name}}" ekranı silinsin mi?',
      allScreens:'Tüm Ekranlar',
      errName:'Ad gerekli', errCode:'Geçersiz kod', errPair:'Eşleştirme başarısız',
      errNotFound:'{{code}} kodu bulunamadı.',
      noScreens:'Ekran Yok', noScreensHint:'İlk ekranını ekle.',
      schedule:'Zamanlama', closeSchedule:'Kapat',
      scheduleRules:'{{n}} kural', noSchedule:'Zamanlama yok',
      noRules:'Kural yok', addRule:'Kural ekle', ruleLabel:'Kural {n}',
      days:['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'],
      from:'Başlangıç', to:'Bitiş',
    },
    st: {
      title:'Ayarlar', mosqueName:'Cami Adı', address:'Adres', logo:'Logo',
      uploadLogo:'Logo Yükle', removeLogo:'Kaldır', uploading:'Yükleniyor…',
      prayerSource:'Namaz Vakti Kaynağı', addCity:'Şehir ekle',
      changeCity:'Şehir değiştir', noCity:'Şehir seçilmedi',
      errName:'Ad gerekli', errUpload:'Yükleme başarısız',
      save:'Kaydet', saving:'Kaydediliyor…', saved:'Kaydedildi',
    },
    pb: {
      back:'Oynatma Listeleri', save:'Kaydet', saving:'Kaydediliyor…', loading:'Yükleniyor…',
      selectSlide:'Düzenlemek için bir slayt seçin.',
      tabSlides:'Slaytlar', tabSettings:'Ayarlar',
      addSlide:'Slayt Ekle', noSlides:'Slayt Yok',
      remove:'Kaldır', change:'Değiştir', set:'Ayarla',
      duration:'Gösterim Süresi', durationHint:'Saniye (0 = sınırsız)',
      design:'Tasarım', lang:'Dil', lang2:'2. Dil', noLang2:'Yok',
      translLang:'Çeviri dili', meaningLang:'Anlam dili',
      transFade:'Geçiş', transSlide:'Kaydır', transZoom:'Yakınlaş', transCut:'Kesim',
      transitionLabel:'Geçiş',
      tickerOverlay:'Alt yazı bandı', tickerMsgPh:'Mesaj…', addMsg:'Mesaj ekle',
      speed:'Hız', fast:'Hızlı', slow:'Yavaş',
      dark:'Koyu', gold:'Altın', green:'Yeşil', light:'Açık',
      color:'Renk', text:'Metin', clock:'Saat', clockHide:'Saati gizle',
      bgImg:'Arka plan görseli', caption:'Açıklama', captionPh:'Açıklama…',
      mediaUrl:'Görsel veya video URL',
      city:'Şehir', prayerSource:'Namaz Vakti Kaynağı',
      prayerSourceCalc:'Hesaplanmış (GPS)',
      prayerSourceHint:'Namaz vakitleri cami ayarlarından',
      mosqueAddr:'Cami Adresi', mosqueName:'Cami Adı',
      mosqueLogo:'Cami Logosu', mosqueLogoHint:'Ayarlardan',
      offsetsTitle:'Zaman düzeltmeleri (dakika)',
      offsetsHint:'Her namaz için pozitif veya negatif dakika',
      rssFeedUrl:'RSS Feed URL', rssLang:'Dil',
      hadithSrc:'Hadis kaynağı',
      asmaulDesc:"Allah'ın 99 güzel ismi",
      evList:'Etkinlikler', evAdd:'Ekle', evRemove:'Kaldır',
      evTitle:'Başlık', evTitlePh:'Etkinlik başlığı…',
      evDate:'Tarih', evTime:'Saat', evDisplay:'Göster', evLang:'Dil',
      donCurrent:'Mevcut tutar', donGoal:'Hedef', donCurrency:'Para birimi',
      donDesc:'Açıklama', donDescription:'Açıklama…',
      donLink:'Bağlantı', donSubtitle:'Alt başlık',
      channels:'Kanallar', channelN:'Kanal {{n}}', chHandlePh:'@kullanıcı',
      chAdd:'Kanal ekle', chRemove:'Kaldır',
      igToken:'Erişim Jetonu', igStep1:'Adım 1', igStep2:'Adım 2',
      igStep3:'Adım 3', igStep4:'Adım 4', igStep5:'Adım 5',
      igHowTo:'Rehber', igManualOr:'Veya manuel ekle:',
      igManualHint:'Görselleri doğrudan URL olarak ekle',
      igAddPost:'Gönderi ekle', igPostN:'Gönderi {{n}}',
      igImageUrlPh:'Görsel URL…', igCaptionPh:'Açıklama…',
      igHandlePh:'@instagram', igAlt:'Alternatif metin',
      ramLang:'Dil', ramDesc:'Ramazan Mübarek',
      ramNote:'Tarih ve namaz vakitleri ayarlardan gelir',
      jumuTime:'Saat', jumuDesc:'Cuma Açıklaması',
      tickerField:'Yazı bandı metni',
      file_:'Dosya', uploading:'Yükleniyor…', lib:'Medya Kütüphanesi',
      libTitle:'Medya Kütüphanesinden Seç', libEmpty:'Medya kütüphanesinde henüz dosya yok.',
      aiTitle:'KI Görsel Oluştur', aiPromptPh:'Görseli tanımla…',
      aiTemplates:'Şablonlar', aiGenerate:'Oluştur',
      aiGenerating:'Oluşturuluyor…', aiLandscape:'16:9', aiPortrait:'9:16',
      aiUse:'Kullan', aiBtn:'KI Görsel', aiAgain:'Yeniden oluştur',
      types: {
        prayer_times:'Namaz Vakitleri', media:'Görsel / Video', ticker:'Yazı Bandı',
        rss:'RSS Feed', weather:'Hava Durumu', hadith:'Hadis', quran:'Kuran Ayeti',
        asmaul_husna:'Esmaül Hüsna', events:'Etkinlikler', donation:'Bağış',
        social_follow:'Sosyal Medya', instagram_feed:'Instagram Feed',
        ramadan:'Ramazan', jumu_a:'Cuma Namazı',
      },
      opts: {},
    },
  },

  // ── العربية ──────────────────────────────────────────────────────────────────
  ar: {
    nav: {
      dashboard:'لوحة التحكم', screens:'الشاشات', playlists:'قوائم التشغيل', settings:'الإعدادات', media:'مكتبة الوسائط',
      signOut:'تسجيل خروج', mStart:'البداية', mContent:'المحتوى', mProfile:'الملف',
    },
    dash: {
      manage:'إدارة شاشات التلفاز وقوائم التشغيل.',
      planContent:'خطط محتواك بالشرائح — أوقات الصلاة والصور والنصوص المتحركة والمزيد.',
      imagesVideos:'إدارة الصور ومقاطع الفيديو وتضمينها في الشرائح.',
      profileLogo:'اسم المسجد والعنوان والشعار للشرائح.',
    },
    pl: {
      title:'قوائم التشغيل', new_:'قائمة جديدة', namePh:'اسم القائمة',
      create:'إنشاء', slideCount:'{{n}} شريحة',
      none:'لا توجد قوائم', noneHint:'أنشئ قائمة التشغيل الأولى.',
      createFirst:'إنشاء القائمة الأولى',
      deleteTitle:'حذف القائمة',
      confirmDelete:'هل تريد حذف قائمة "{{name}}"؟', cancel:'إلغاء',
    },
    sc: {
      title:'الشاشات', add:'إضافة شاشة', namePh:'اسم الشاشة',
      save:'حفظ', cancel:'إلغاء',
      pair:'إقران', pairTitle:'إقران الشاشة', pairingCode:'رمز الإقران',
      codePh:'أدخل الرمز المكون من 6 أرقام',
      assign:'تعيين', choosePlaylist:'اختر قائمة…', noPlaylist:'لا توجد قائمة',
      online:'متصل', offline:'غير متصل',
      city:'المدينة', addCity:'إضافة مدينة', changeCity:'تغيير المدينة', noPrayerCity:'لا توجد مدينة',
      deleteTitle:'حذف الشاشة', confirmDelete:'هل تريد حذف شاشة "{{name}}"؟',
      allScreens:'جميع الشاشات',
      errName:'الاسم مطلوب', errCode:'رمز غير صالح', errPair:'فشل الإقران',
      errNotFound:'الرمز {{code}} غير موجود.',
      noScreens:'لا توجد شاشات', noScreensHint:'أضف شاشتك الأولى.',
      schedule:'الجدول الزمني', closeSchedule:'إغلاق',
      scheduleRules:'{{n}} قواعد', noSchedule:'لا يوجد جدول',
      noRules:'لا توجد قواعد', addRule:'إضافة قاعدة', ruleLabel:'قاعدة {n}',
      days:['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'],
      from:'من', to:'إلى',
    },
    st: {
      title:'الإعدادات', mosqueName:'اسم المسجد', address:'العنوان', logo:'الشعار',
      uploadLogo:'رفع الشعار', removeLogo:'إزالة', uploading:'جار الرفع…',
      prayerSource:'مصدر أوقات الصلاة', addCity:'إضافة مدينة',
      changeCity:'تغيير المدينة', noCity:'لم يتم اختيار مدينة',
      errName:'الاسم مطلوب', errUpload:'فشل الرفع',
      save:'حفظ', saving:'جار الحفظ…', saved:'تم الحفظ',
    },
    pb: {
      back:'قوائم التشغيل', save:'حفظ', saving:'جار الحفظ…', loading:'جار التحميل…',
      selectSlide:'اختر شريحة لتعديلها.',
      tabSlides:'الشرائح', tabSettings:'الإعدادات',
      addSlide:'إضافة شريحة', noSlides:'لا توجد شرائح',
      remove:'إزالة', change:'تغيير', set:'تعيين',
      duration:'مدة العرض', durationHint:'ثوانٍ (0 = غير محدود)',
      design:'التصميم', lang:'اللغة', lang2:'اللغة الثانية', noLang2:'بدون',
      translLang:'لغة الترجمة', meaningLang:'لغة المعنى',
      transFade:'تلاشٍ', transSlide:'انزلاق', transZoom:'تكبير', transCut:'قطع',
      transitionLabel:'الانتقال',
      tickerOverlay:'شريط أخبار', tickerMsgPh:'رسالة…', addMsg:'إضافة رسالة',
      speed:'السرعة', fast:'سريع', slow:'بطيء',
      dark:'داكن', gold:'ذهبي', green:'أخضر', light:'فاتح',
      color:'اللون', text:'النص', clock:'الساعة', clockHide:'إخفاء الساعة',
      bgImg:'صورة الخلفية', caption:'التسمية التوضيحية', captionPh:'تسمية توضيحية…',
      mediaUrl:'رابط الصورة أو الفيديو',
      city:'المدينة', prayerSource:'مصدر أوقات الصلاة',
      prayerSourceCalc:'محسوب (GPS)',
      prayerSourceHint:'أوقات الصلاة من إعدادات المسجد',
      mosqueAddr:'عنوان المسجد', mosqueName:'اسم المسجد',
      mosqueLogo:'شعار المسجد', mosqueLogoHint:'من الإعدادات',
      offsetsTitle:'تعديلات الوقت (دقائق)',
      offsetsHint:'دقائق موجبة أو سالبة لكل صلاة',
      rssFeedUrl:'رابط RSS Feed', rssLang:'اللغة',
      hadithSrc:'مصدر الحديث',
      asmaulDesc:'الأسماء الحسنى التسعة والتسعون',
      evList:'الفعاليات', evAdd:'إضافة', evRemove:'إزالة',
      evTitle:'العنوان', evTitlePh:'عنوان الفعالية…',
      evDate:'التاريخ', evTime:'الوقت', evDisplay:'العرض', evLang:'اللغة',
      donCurrent:'المبلغ الحالي', donGoal:'الهدف', donCurrency:'العملة',
      donDesc:'الوصف', donDescription:'الوصف…',
      donLink:'الرابط', donSubtitle:'العنوان الفرعي',
      channels:'القنوات', channelN:'القناة {{n}}', chHandlePh:'@المستخدم',
      chAdd:'إضافة قناة', chRemove:'إزالة',
      igToken:'رمز الوصول', igStep1:'الخطوة 1', igStep2:'الخطوة 2',
      igStep3:'الخطوة 3', igStep4:'الخطوة 4', igStep5:'الخطوة 5',
      igHowTo:'دليل', igManualOr:'أو أضف يدوياً:',
      igManualHint:'أضف الصور مباشرة كروابط',
      igAddPost:'إضافة منشور', igPostN:'منشور {{n}}',
      igImageUrlPh:'رابط الصورة…', igCaptionPh:'تسمية توضيحية…',
      igHandlePh:'@instagram', igAlt:'نص بديل',
      ramLang:'اللغة', ramDesc:'رمضان مبارك',
      ramNote:'التاريخ وأوقات الصلاة تأتي من الإعدادات',
      jumuTime:'الوقت', jumuDesc:'وصف الجمعة',
      tickerField:'نص الشريط',
      file_:'ملف', uploading:'جار الرفع…', lib:'مكتبة الوسائط',
      libTitle:'اختر من مكتبة الوسائط', libEmpty:'لا توجد ملفات في مكتبة الوسائط بعد.',
      aiTitle:'توليد صورة بالذكاء الاصطناعي', aiPromptPh:'صف الصورة…',
      aiTemplates:'قوالب', aiGenerate:'توليد',
      aiGenerating:'جار التوليد…', aiLandscape:'16:9', aiPortrait:'9:16',
      aiUse:'استخدام', aiBtn:'صورة ذكاء اصطناعي', aiAgain:'إعادة التوليد',
      types: {
        prayer_times:'أوقات الصلاة', media:'صورة / فيديو', ticker:'شريط أخبار',
        rss:'RSS Feed', weather:'الطقس', hadith:'حديث', quran:'آية قرآنية',
        asmaul_husna:'أسماء الله الحسنى', events:'فعاليات', donation:'تبرع',
        social_follow:'التواصل الاجتماعي', instagram_feed:'انستغرام',
        ramadan:'رمضان', jumu_a:'صلاة الجمعة',
      },
      opts: {},
    },
  },

  // ── Français ─────────────────────────────────────────────────────────────────
  fr: {
    nav: {
      dashboard:'Tableau de bord', screens:'Écrans', playlists:'Playlists', settings:'Paramètres', media:'Médiathèque',
      signOut:'Déconnexion', mStart:'Début', mContent:'Contenu', mProfile:'Profil',
    },
    dash: {
      manage:'Gérez vos écrans TV et playlists.',
      planContent:'Planifiez votre contenu avec des diapositives — horaires de prière, images, bandeaux et plus.',
      imagesVideos:'Gérez les images et vidéos et intégrez-les dans les diapositives.',
      profileLogo:'Nom de la mosquée, adresse et logo pour les diapositives.',
    },
    pl: {
      title:'Playlists', new_:'Nouvelle Playlist', namePh:'Nom de la playlist',
      create:'Créer', slideCount:'{{n}} diapositives',
      none:'Aucune Playlist', noneHint:'Créez votre première playlist.',
      createFirst:'Créer la première playlist',
      deleteTitle:'Supprimer la Playlist',
      confirmDelete:'Supprimer la playlist "{{name}}" ?', cancel:'Annuler',
    },
    sc: {
      title:'Écrans', add:'Ajouter un écran', namePh:"Nom de l'écran",
      save:'Enregistrer', cancel:'Annuler',
      pair:'Associer', pairTitle:"Associer l'écran", pairingCode:"Code d'association",
      codePh:'Entrez le code à 6 chiffres',
      assign:'Assigner', choosePlaylist:'Choisir une playlist…', noPlaylist:'Pas de Playlist',
      online:'En ligne', offline:'Hors ligne',
      city:'Ville', addCity:'Ajouter une ville', changeCity:'Changer de ville', noPrayerCity:'Pas de ville',
      deleteTitle:"Supprimer l'écran", confirmDelete:'Supprimer l\'écran "{{name}}" ?',
      allScreens:'Tous les Écrans',
      errName:'Nom requis', errCode:'Code invalide', errPair:"Échec de l'association",
      errNotFound:'Code {{code}} introuvable.',
      noScreens:'Aucun Écran', noScreensHint:'Ajoutez votre premier écran.',
      schedule:'Planification', closeSchedule:'Fermer',
      scheduleRules:'{{n}} règles', noSchedule:'Pas de planification',
      noRules:'Aucune règle', addRule:'Ajouter une règle', ruleLabel:'Règle {n}',
      days:['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
      from:'De', to:'À',
    },
    st: {
      title:'Paramètres', mosqueName:'Nom de la Mosquée', address:'Adresse', logo:'Logo',
      uploadLogo:'Télécharger le Logo', removeLogo:'Supprimer', uploading:'Téléchargement…',
      prayerSource:'Source des Horaires de Prière', addCity:'Ajouter une ville',
      changeCity:'Changer de ville', noCity:'Aucune ville sélectionnée',
      errName:'Nom requis', errUpload:'Échec du téléchargement',
      save:'Enregistrer', saving:'Enregistrement…', saved:'Enregistré',
    },
    pb: {
      back:'Playlists', save:'Enregistrer', saving:'Enregistrement…', loading:'Chargement…',
      selectSlide:'Sélectionnez une diapositive pour la modifier.',
      tabSlides:'Diapositives', tabSettings:'Paramètres',
      addSlide:'Ajouter une Diapositive', noSlides:'Aucune Diapositive',
      remove:'Supprimer', change:'Modifier', set:'Définir',
      duration:"Durée d'affichage", durationHint:'Secondes (0 = illimité)',
      design:'Design', lang:'Langue', lang2:'2ème Langue', noLang2:'Aucune',
      translLang:'Langue de traduction', meaningLang:'Langue de signification',
      transFade:'Fondu', transSlide:'Glissement', transZoom:'Zoom', transCut:'Coupe',
      transitionLabel:'Transition',
      tickerOverlay:'Bandeau défilant', tickerMsgPh:'Message…', addMsg:'Ajouter un message',
      speed:'Vitesse', fast:'Rapide', slow:'Lent',
      dark:'Sombre', gold:'Or', green:'Vert', light:'Clair',
      color:'Couleur', text:'Texte', clock:'Horloge', clockHide:"Masquer l'horloge",
      bgImg:"Image d'arrière-plan", caption:'Légende', captionPh:'Légende…',
      mediaUrl:"URL de l'image ou de la vidéo",
      city:'Ville', prayerSource:'Source des Horaires de Prière',
      prayerSourceCalc:'Calculé (GPS)',
      prayerSourceHint:'Horaires de prière depuis les paramètres de la mosquée',
      mosqueAddr:'Adresse de la Mosquée', mosqueName:'Nom de la Mosquée',
      mosqueLogo:'Logo de la Mosquée', mosqueLogoHint:'Depuis les paramètres',
      offsetsTitle:'Corrections de temps (minutes)',
      offsetsHint:'Minutes positives ou négatives par prière',
      rssFeedUrl:'URL du flux RSS', rssLang:'Langue',
      hadithSrc:'Source du hadith',
      asmaulDesc:'Les 99 beaux noms d\'Allah',
      evList:'Événements', evAdd:'Ajouter', evRemove:'Supprimer',
      evTitle:'Titre', evTitlePh:"Titre de l'événement…",
      evDate:'Date', evTime:'Heure', evDisplay:'Affichage', evLang:'Langue',
      donCurrent:'Montant actuel', donGoal:'Objectif', donCurrency:'Devise',
      donDesc:'Description', donDescription:'Description…',
      donLink:'Lien', donSubtitle:'Sous-titre',
      channels:'Chaînes', channelN:'Chaîne {{n}}', chHandlePh:'@compte',
      chAdd:'Ajouter une chaîne', chRemove:'Supprimer',
      igToken:"Jeton d'accès", igStep1:'Étape 1', igStep2:'Étape 2',
      igStep3:'Étape 3', igStep4:'Étape 4', igStep5:'Étape 5',
      igHowTo:'Guide', igManualOr:'Ou ajouter manuellement :',
      igManualHint:'Ajouter des images directement en URL',
      igAddPost:'Ajouter une publication', igPostN:'Publication {{n}}',
      igImageUrlPh:"URL de l'image…", igCaptionPh:'Légende…',
      igHandlePh:'@instagram', igAlt:'Texte alternatif',
      ramLang:'Langue', ramDesc:'Ramadan Mubarak',
      ramNote:'La date et les horaires de prière viennent des paramètres',
      jumuTime:'Heure', jumuDesc:'Description du Vendredi',
      tickerField:'Texte du bandeau',
      file_:'Fichier', uploading:'Téléchargement…', lib:'Médiathèque',
      libTitle:'Choisir dans la Médiathèque', libEmpty:'Aucun fichier dans la médiathèque.',
      aiTitle:'Générer une Image IA', aiPromptPh:"Décrivez l'image…",
      aiTemplates:'Modèles', aiGenerate:'Générer',
      aiGenerating:'Génération…', aiLandscape:'16:9', aiPortrait:'9:16',
      aiUse:'Utiliser', aiBtn:'Image IA', aiAgain:'Régénérer',
      types: {
        prayer_times:'Horaires de Prière', media:'Image / Vidéo', ticker:'Bandeau',
        rss:'Flux RSS', weather:'Météo', hadith:'Hadith', quran:'Verset Coranique',
        asmaul_husna:'Asmaul Husna', events:'Événements', donation:'Don',
        social_follow:'Réseaux Sociaux', instagram_feed:'Instagram Feed',
        ramadan:'Ramadan', jumu_a:"Jumu'a · Vendredi",
      },
      opts: {},
    },
  },

  // ── Nederlands ───────────────────────────────────────────────────────────────
  nl: {
    nav: {
      dashboard:'Dashboard', screens:'Schermen', playlists:'Afspeellijsten', settings:'Instellingen', media:'Mediabibliotheek',
      signOut:'Uitloggen', mStart:'Start', mContent:'Inhoud', mProfile:'Profiel',
    },
    dash: {
      manage:'Beheer je TV-schermen en afspeellijsten.',
      planContent:'Plan je inhoud met dia\'s — gebedstijden, afbeeldingen, tekstvakken en meer.',
      imagesVideos:'Beheer afbeeldingen en video\'s en voeg ze in dia\'s in.',
      profileLogo:'Naam, adres en logo van de moskee voor dia\'s.',
    },
    pl: {
      title:'Afspeellijsten', new_:'Nieuwe Afspeellijst', namePh:'Naam afspeellijst',
      create:'Aanmaken', slideCount:'{{n}} dia\'s',
      none:'Geen Afspeellijsten', noneHint:'Maak je eerste afspeellijst aan.',
      createFirst:'Eerste afspeellijst aanmaken',
      deleteTitle:'Afspeellijst Verwijderen',
      confirmDelete:'Afspeellijst "{{name}}" echt verwijderen?', cancel:'Annuleren',
    },
    sc: {
      title:'Schermen', add:'Scherm Toevoegen', namePh:'Schermnaam',
      save:'Opslaan', cancel:'Annuleren',
      pair:'Koppelen', pairTitle:'Scherm Koppelen', pairingCode:'Koppelcode',
      codePh:'6-cijferige code invoeren',
      assign:'Toewijzen', choosePlaylist:'Afspeellijst kiezen…', noPlaylist:'Geen Afspeellijst',
      online:'Online', offline:'Offline',
      city:'Stad', addCity:'Stad toevoegen', changeCity:'Stad wijzigen', noPrayerCity:'Geen stad',
      deleteTitle:'Scherm Verwijderen', confirmDelete:'Scherm "{{name}}" echt verwijderen?',
      allScreens:'Alle Schermen',
      errName:'Naam vereist', errCode:'Ongeldige code', errPair:'Koppeling mislukt',
      errNotFound:'Code {{code}} niet gevonden.',
      noScreens:'Geen Schermen', noScreensHint:'Voeg je eerste scherm toe.',
      schedule:'Planning', closeSchedule:'Sluiten',
      scheduleRules:'{{n}} regels', noSchedule:'Geen planning',
      noRules:'Geen regels', addRule:'Regel toevoegen', ruleLabel:'Regel {n}',
      days:['Zo','Ma','Di','Wo','Do','Vr','Za'],
      from:'Van', to:'Tot',
    },
    st: {
      title:'Instellingen', mosqueName:'Naam Moskee', address:'Adres', logo:'Logo',
      uploadLogo:'Logo Uploaden', removeLogo:'Verwijderen', uploading:'Bezig…',
      prayerSource:'Bron Gebedstijden', addCity:'Stad toevoegen',
      changeCity:'Stad wijzigen', noCity:'Geen stad geselecteerd',
      errName:'Naam vereist', errUpload:'Upload mislukt',
      save:'Opslaan', saving:'Opslaan…', saved:'Opgeslagen',
    },
    pb: {
      back:'Afspeellijsten', save:'Opslaan', saving:'Opslaan…', loading:'Laden…',
      selectSlide:'Selecteer een dia om hem te bewerken.',
      tabSlides:"Dia's", tabSettings:'Instellingen',
      addSlide:"Dia Toevoegen", noSlides:"Geen Dia's",
      remove:'Verwijderen', change:'Wijzigen', set:'Instellen',
      duration:'Weergaveduur', durationHint:'Seconden (0 = onbeperkt)',
      design:'Ontwerp', lang:'Taal', lang2:'2e Taal', noLang2:'Geen',
      translLang:'Vertaaltaal', meaningLang:'Betekenistaal',
      transFade:'Overgang', transSlide:'Schuiven', transZoom:'Zoom', transCut:'Snijden',
      transitionLabel:'Overgang',
      tickerOverlay:'Nieuwsband', tickerMsgPh:'Bericht…', addMsg:'Bericht toevoegen',
      speed:'Snelheid', fast:'Snel', slow:'Langzaam',
      dark:'Donker', gold:'Goud', green:'Groen', light:'Licht',
      color:'Kleur', text:'Tekst', clock:'Klok', clockHide:'Klok verbergen',
      bgImg:'Achtergrondafbeelding', caption:'Bijschrift', captionPh:'Bijschrift…',
      mediaUrl:'URL van afbeelding of video',
      city:'Stad', prayerSource:'Bron Gebedstijden',
      prayerSourceCalc:'Berekend (GPS)',
      prayerSourceHint:'Gebedstijden uit moskee-instellingen',
      mosqueAddr:'Adres Moskee', mosqueName:'Naam Moskee',
      mosqueLogo:'Logo Moskee', mosqueLogoHint:'Uit instellingen',
      offsetsTitle:'Tijdcorrecties (minuten)',
      offsetsHint:'Positieve of negatieve minuten per gebed',
      rssFeedUrl:'RSS Feed URL', rssLang:'Taal',
      hadithSrc:'Hadith-bron',
      asmaulDesc:'De 99 mooie namen van Allah',
      evList:'Evenementen', evAdd:'Toevoegen', evRemove:'Verwijderen',
      evTitle:'Titel', evTitlePh:'Evenementtitel…',
      evDate:'Datum', evTime:'Tijd', evDisplay:'Weergave', evLang:'Taal',
      donCurrent:'Huidig bedrag', donGoal:'Doel', donCurrency:'Valuta',
      donDesc:'Beschrijving', donDescription:'Beschrijving…',
      donLink:'Link', donSubtitle:'Ondertitel',
      channels:'Kanalen', channelN:'Kanaal {{n}}', chHandlePh:'@account',
      chAdd:'Kanaal toevoegen', chRemove:'Verwijderen',
      igToken:'Toegangstoken', igStep1:'Stap 1', igStep2:'Stap 2',
      igStep3:'Stap 3', igStep4:'Stap 4', igStep5:'Stap 5',
      igHowTo:'Handleiding', igManualOr:'Of handmatig toevoegen:',
      igManualHint:'Afbeeldingen direct als URL toevoegen',
      igAddPost:'Bericht toevoegen', igPostN:'Bericht {{n}}',
      igImageUrlPh:'Afbeelding URL…', igCaptionPh:'Bijschrift…',
      igHandlePh:'@instagram', igAlt:'Alternatieve tekst',
      ramLang:'Taal', ramDesc:'Ramadan Mubarak',
      ramNote:'Datum en gebedstijden komen uit de instellingen',
      jumuTime:'Tijd', jumuDesc:'Vrijdag Beschrijving',
      tickerField:'Nieuwsbandtekst',
      file_:'Bestand', uploading:'Bezig…', lib:'Mediabibliotheek',
      libTitle:'Kiezen uit Mediabibliotheek', libEmpty:'Nog geen bestanden in de mediabibliotheek.',
      aiTitle:'AI Afbeelding Genereren', aiPromptPh:'Beschrijf de afbeelding…',
      aiTemplates:'Sjablonen', aiGenerate:'Genereren',
      aiGenerating:'Genereren…', aiLandscape:'16:9', aiPortrait:'9:16',
      aiUse:'Gebruiken', aiBtn:'AI Afbeelding', aiAgain:'Opnieuw genereren',
      types: {
        prayer_times:'Gebedstijden', media:'Afbeelding / Video', ticker:'Nieuwsband',
        rss:'RSS Feed', weather:'Weer', hadith:'Hadith', quran:'Koranvers',
        asmaul_husna:'Asmaul Husna', events:'Evenementen', donation:'Donatie',
        social_follow:'Sociale Media', instagram_feed:'Instagram Feed',
        ramadan:'Ramadan', jumu_a:"Vrijdaggebed",
      },
      opts: {},
    },
  },

  // ── Bosanski ─────────────────────────────────────────────────────────────────
  bs: {
    nav: {
      dashboard:'Kontrolna Tabla', screens:'Ekrani', playlists:'Playliste', settings:'Postavke', media:'Medijska Biblioteka',
      signOut:'Odjava', mStart:'Početak', mContent:'Sadržaj', mProfile:'Profil',
    },
    dash: {
      manage:'Upravljaj TV ekranima i playlistama.',
      planContent:'Planiraj sadržaj sa slajdovima — vremena namaza, slike, trake i više.',
      imagesVideos:'Upravljaj slikama i videima i dodaj ih u slajdove.',
      profileLogo:'Ime džamije, adresa i logo za slajdove.',
    },
    pl: {
      title:'Playliste', new_:'Nova Playlista', namePh:'Naziv playliste',
      create:'Kreiraj', slideCount:'{{n}} slajdova',
      none:'Nema Playlista', noneHint:'Kreiraj svoju prvu playlistu.',
      createFirst:'Kreiraj prvu playlistu',
      deleteTitle:'Obriši Playlistu',
      confirmDelete:'Stvarno obrisati playlistu "{{name}}"?', cancel:'Odustani',
    },
    sc: {
      title:'Ekrani', add:'Dodaj Ekran', namePh:'Naziv ekrana',
      save:'Spremi', cancel:'Odustani',
      pair:'Upari', pairTitle:'Upari Ekran', pairingCode:'Kod za Uparivanje',
      codePh:'Unesi 6-znamenkasti kod',
      assign:'Dodijeli', choosePlaylist:'Odaberi playlistu…', noPlaylist:'Nema Playliste',
      online:'Online', offline:'Offline',
      city:'Grad', addCity:'Dodaj grad', changeCity:'Promijeni grad', noPrayerCity:'Nema grada',
      deleteTitle:'Obriši Ekran', confirmDelete:'Stvarno obrisati ekran "{{name}}"?',
      allScreens:'Svi Ekrani',
      errName:'Naziv je obavezan', errCode:'Nevažeći kod', errPair:'Uparivanje neuspješno',
      errNotFound:'Kod {{code}} nije pronađen.',
      noScreens:'Nema Ekrana', noScreensHint:'Dodaj svoj prvi ekran.',
      schedule:'Raspored', closeSchedule:'Zatvori',
      scheduleRules:'{{n}} pravila', noSchedule:'Nema rasporeda',
      noRules:'Nema pravila', addRule:'Dodaj pravilo', ruleLabel:'Pravilo {n}',
      days:['Ned','Pon','Uto','Sri','Čet','Pet','Sub'],
      from:'Od', to:'Do',
    },
    st: {
      title:'Postavke', mosqueName:'Naziv Džamije', address:'Adresa', logo:'Logo',
      uploadLogo:'Učitaj Logo', removeLogo:'Ukloni', uploading:'Učitavanje…',
      prayerSource:'Izvor Vremena Namaza', addCity:'Dodaj grad',
      changeCity:'Promijeni grad', noCity:'Nije odabran grad',
      errName:'Naziv je obavezan', errUpload:'Učitavanje neuspješno',
      save:'Spremi', saving:'Spremanje…', saved:'Spremljeno',
    },
    pb: {
      back:'Playliste', save:'Spremi', saving:'Spremanje…', loading:'Učitavanje…',
      selectSlide:'Odaberi slajd za uređivanje.',
      tabSlides:'Slajdovi', tabSettings:'Postavke',
      addSlide:'Dodaj Slajd', noSlides:'Nema Slajdova',
      remove:'Ukloni', change:'Promijeni', set:'Postavi',
      duration:'Trajanje Prikaza', durationHint:'Sekunde (0 = neograničeno)',
      design:'Dizajn', lang:'Jezik', lang2:'2. Jezik', noLang2:'Bez',
      translLang:'Jezik prijevoda', meaningLang:'Jezik značenja',
      transFade:'Prelaz', transSlide:'Klizanje', transZoom:'Zum', transCut:'Rez',
      transitionLabel:'Prijelaz',
      tickerOverlay:'Traka vijesti', tickerMsgPh:'Poruka…', addMsg:'Dodaj poruku',
      speed:'Brzina', fast:'Brzo', slow:'Sporo',
      dark:'Tamno', gold:'Zlatno', green:'Zeleno', light:'Svijetlo',
      color:'Boja', text:'Tekst', clock:'Sat', clockHide:'Sakrij sat',
      bgImg:'Pozadinska slika', caption:'Naslov', captionPh:'Naslov…',
      mediaUrl:'URL slike ili videa',
      city:'Grad', prayerSource:'Izvor Vremena Namaza',
      prayerSourceCalc:'Izračunato (GPS)',
      prayerSourceHint:'Vremena namaza iz postavki džamije',
      mosqueAddr:'Adresa Džamije', mosqueName:'Naziv Džamije',
      mosqueLogo:'Logo Džamije', mosqueLogoHint:'Iz postavki',
      offsetsTitle:'Ispravke vremena (minute)',
      offsetsHint:'Pozitivne ili negativne minute po namazu',
      rssFeedUrl:'RSS Feed URL', rssLang:'Jezik',
      hadithSrc:'Izvor hadisa',
      asmaulDesc:'99 lijepih Allahovih imena',
      evList:'Događaji', evAdd:'Dodaj', evRemove:'Ukloni',
      evTitle:'Naslov', evTitlePh:'Naslov događaja…',
      evDate:'Datum', evTime:'Vrijeme', evDisplay:'Prikaz', evLang:'Jezik',
      donCurrent:'Trenutni iznos', donGoal:'Cilj', donCurrency:'Valuta',
      donDesc:'Opis', donDescription:'Opis…',
      donLink:'Link', donSubtitle:'Podnaslov',
      channels:'Kanali', channelN:'Kanal {{n}}', chHandlePh:'@korisnik',
      chAdd:'Dodaj kanal', chRemove:'Ukloni',
      igToken:'Token za pristup', igStep1:'Korak 1', igStep2:'Korak 2',
      igStep3:'Korak 3', igStep4:'Korak 4', igStep5:'Korak 5',
      igHowTo:'Vodič', igManualOr:'Ili dodaj ručno:',
      igManualHint:'Dodaj slike direktno kao URL',
      igAddPost:'Dodaj objavu', igPostN:'Objava {{n}}',
      igImageUrlPh:'URL slike…', igCaptionPh:'Naslov…',
      igHandlePh:'@instagram', igAlt:'Alternativni tekst',
      ramLang:'Jezik', ramDesc:'Ramazan Mubarak',
      ramNote:'Datum i vremena namaza dolaze iz postavki',
      jumuTime:'Vrijeme', jumuDesc:'Opis Džume',
      tickerField:'Tekst trake vijesti',
      file_:'Datoteka', uploading:'Učitavanje…', lib:'Medijska Biblioteka',
      libTitle:'Odaberi iz Medijske Biblioteke', libEmpty:'Još nema datoteka u medijskoj biblioteci.',
      aiTitle:'Generiraj AI Sliku', aiPromptPh:'Opiši sliku…',
      aiTemplates:'Predlošci', aiGenerate:'Generiraj',
      aiGenerating:'Generiranje…', aiLandscape:'16:9', aiPortrait:'9:16',
      aiUse:'Koristi', aiBtn:'AI Slika', aiAgain:'Ponovo generiraj',
      types: {
        prayer_times:'Vremena Namaza', media:'Slika / Video', ticker:'Traka Vijesti',
        rss:'RSS Feed', weather:'Vrijeme', hadith:'Hadis', quran:'Kur\'anski Ajet',
        asmaul_husna:'Esmaul Husna', events:'Događaji', donation:'Donacija',
        social_follow:'Društvene Mreže', instagram_feed:'Instagram Feed',
        ramadan:'Ramazan', jumu_a:"Džuma Namaz",
      },
      opts: {},
    },
  },
}
