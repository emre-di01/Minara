import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useProfile } from '../../lib/profile'
import { useCmsT, LanguageSwitcher } from '../../lib/cms-lang'

const NAV_ROUTES = [
  { to: '/admin',           key: 'dashboard' as const, mobileKey: 'mStart' as const,   icon: '⊞' },
  { to: '/admin/screens',   key: 'screens'   as const, mobileKey: 'screens' as const,  icon: '📺' },
  { to: '/admin/playlists', key: 'playlists' as const, mobileKey: 'mContent' as const, icon: '🎞️' },
  { to: '/admin/media',     key: 'media'     as const, mobileKey: 'media' as const,    icon: '📁' },
  { to: '/admin/settings',  key: 'settings'  as const, mobileKey: 'mProfile' as const, icon: '⚙️' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const { profile } = useProfile()
  const { pathname } = useLocation()
  const t = useCmsT()

  const mosqueName = profile?.name || 'Signage CMS'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          {profile?.logo_url && (
            <img src={profile.logo_url} alt="Logo" className="w-7 h-7 rounded-md object-cover" />
          )}
          <span className="text-white font-bold truncate max-w-[130px]">{mosqueName}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher dropDir="down" dropAlign="right" />
          <button onClick={signOut} className="text-gray-400 text-sm hover:text-white transition">
            {t.nav.signOut}
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-gray-900 flex-col shrink-0 border-r border-gray-800">
        <div className="px-5 py-5 border-b border-gray-800 flex items-center gap-3">
          {profile?.logo_url
            ? <img src={profile.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            : <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-800/50 flex items-center justify-center text-base shrink-0">🕌</div>
          }
          <span className="text-white font-bold text-sm leading-tight truncate">{mosqueName}</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {NAV_ROUTES.map(({ to, key, icon }) => {
            const active = pathname === to || (to !== '/admin' && pathname.startsWith(to))
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? 'bg-emerald-600 text-white font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-base w-5 text-center shrink-0">{icon}</span>
                {t.nav[key]}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-gray-800 flex flex-col gap-1">
          <LanguageSwitcher />
          <button onClick={signOut}
            className="w-full text-left px-3 py-2.5 text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition flex items-center gap-3">
            <span className="w-5 text-center shrink-0">↩</span>
            {t.nav.signOut}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex z-40 safe-bottom">
        {NAV_ROUTES.map(({ to, mobileKey, icon }) => {
          const active = pathname === to || (to !== '/admin' && pathname.startsWith(to))
          return (
            <Link key={to} to={to}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[3.5rem] py-2 transition ${
                active ? 'text-emerald-400' : 'text-gray-500'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-emerald-500" />
              )}
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[10px] font-medium leading-none tracking-wide">{t.nav[mobileKey]}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
