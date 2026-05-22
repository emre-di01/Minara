import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import RequireAuth from './cms/components/RequireAuth'
import Login from './cms/pages/Login'
import Dashboard from './cms/pages/Dashboard'
import Screens from './cms/pages/Screens'
import Playlists from './cms/pages/Playlists'
import PlaylistBuilder from './cms/pages/PlaylistBuilder'
import DisplayEntry from './screen/DisplayEntry'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* TV-Kiosk — feste URL, kein Parameter */}
          <Route path="/tv" element={<DisplayEntry />} />

          {/* CMS Auth */}
          <Route path="/admin/login" element={<Login />} />

          {/* CMS — geschützt */}
          <Route path="/admin" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/admin/screens" element={<RequireAuth><Screens /></RequireAuth>} />
          <Route path="/admin/playlists" element={<RequireAuth><Playlists /></RequireAuth>} />
          <Route path="/admin/playlists/:id" element={<RequireAuth><PlaylistBuilder /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
