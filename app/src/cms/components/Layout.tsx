import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '⊞' },
  { to: '/admin/screens', label: 'Screens', icon: '📺' },
  { to: '/admin/playlists', label: 'Playlists', icon: '🎞️' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-gray-800">
          <span className="text-white font-bold text-lg">Signage CMS</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(({ to, label, icon }) => {
            const active = pathname === to || (to !== '/admin' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={signOut}
            className="w-full text-left px-3 py-2.5 text-sm text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
