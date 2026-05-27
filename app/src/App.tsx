import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProfileProvider } from './lib/profile'
import { CmsLangProvider } from './lib/cms-lang'
import RequireAuth from './cms/components/RequireAuth'
import Login from './cms/pages/Login'
import Dashboard from './cms/pages/Dashboard'
import Screens from './cms/pages/Screens'
import Playlists from './cms/pages/Playlists'
import PlaylistBuilder from './cms/pages/PlaylistBuilder'
import Settings from './cms/pages/Settings'
import ResetPassword from './cms/pages/ResetPassword'
import MediaLibrary from './cms/pages/MediaLibrary'
import DisplayEntry from './screen/DisplayEntry'

export default function App() {
  return (
    <AuthProvider>
      <CmsLangProvider>
      <ProfileProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/tv" element={<DisplayEntry />} />

            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin/reset-password" element={<ResetPassword />} />

            <Route path="/admin" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/admin/screens" element={<RequireAuth><Screens /></RequireAuth>} />
            <Route path="/admin/playlists" element={<RequireAuth><Playlists /></RequireAuth>} />
            <Route path="/admin/playlists/:id" element={<RequireAuth><PlaylistBuilder /></RequireAuth>} />
            <Route path="/admin/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/admin/media" element={<RequireAuth><MediaLibrary /></RequireAuth>} />

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
      </CmsLangProvider>
    </AuthProvider>
  )
}
