import React, { createContext, useContext, useState, useCallback } from 'react'
import { CMS, CMS_LANGUAGES, type CmsLang, type CmsStrings } from './cms-i18n'

// ─── Context ──────────────────────────────────────────────────────────────────

interface CmsLangCtx {
  lang: CmsLang
  setLang: (l: CmsLang) => void
  t: CmsStrings
}

const Ctx = createContext<CmsLangCtx | null>(null)

function detectLang(): CmsLang {
  const saved = localStorage.getItem('cms-lang') as CmsLang
  if (saved && CMS_LANGUAGES.find(l => l.code === saved)) return saved
  const browser = navigator.language.split('-')[0] as CmsLang
  return CMS_LANGUAGES.find(l => l.code === browser)?.code ?? 'de'
}

export function CmsLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<CmsLang>(detectLang)

  const setLang = useCallback((l: CmsLang) => {
    localStorage.setItem('cms-lang', l)
    setLangState(l)
  }, [])

  return (
    <Ctx.Provider value={{ lang, setLang, t: CMS[lang] }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCmsT(): CmsStrings {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCmsT must be used inside CmsLangProvider')
  return ctx.t
}

export function useCmsLang(): { lang: CmsLang; setLang: (l: CmsLang) => void } {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCmsLang must be used inside CmsLangProvider')
  return { lang: ctx.lang, setLang: ctx.setLang }
}

// ─── Language Switcher ────────────────────────────────────────────────────────

export function LanguageSwitcher({
  className = '',
  dropDir = 'up',
  dropAlign = 'left',
}: {
  className?: string
  /** Whether the dropdown opens upward (default) or downward */
  dropDir?: 'up' | 'down'
  /** Horizontal alignment of the dropdown relative to the trigger button */
  dropAlign?: 'left' | 'right'
}) {
  const { lang, setLang } = useCmsLang()
  const [open, setOpen] = useState(false)

  const posY = dropDir === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
  const posX = dropAlign === 'right' ? 'right-0' : 'left-0'

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition"
        title="Interface language"
      >
        <span className="text-[10px] tracking-widest uppercase">{lang}</span>
        <span className="text-[8px] opacity-50">▼</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute ${posY} ${posX} z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[120px]`}>
            {CMS_LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs transition flex items-center gap-2 ${
                  lang === l.code
                    ? 'bg-emerald-900/40 text-emerald-400'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="w-6 text-[10px] uppercase tracking-wider text-gray-500 shrink-0">{l.code}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
