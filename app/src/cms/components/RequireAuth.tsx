import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useProfile } from '../../lib/profile'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { profile, profileLoading } = useProfile()
  const { pathname } = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />

  // Onboarding: kein Profil oder Name leer → zu Settings
  if (pathname !== '/admin/settings' && (!profile || !profile.name)) {
    return <Navigate to="/admin/settings" replace />
  }

  return <>{children}</>
}
