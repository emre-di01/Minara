import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

export default function Dashboard() {
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-white text-xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <Link
            to="/admin/screens"
            className="bg-gray-900 hover:bg-gray-800 rounded-xl p-5 transition"
          >
            <div className="text-3xl mb-2">📺</div>
            <div className="font-semibold text-white">Screens</div>
            <div className="text-sm text-gray-400 mt-1">Screens verwalten & koppeln</div>
          </Link>
          <Link
            to="/admin/playlists"
            className="bg-gray-900 hover:bg-gray-800 rounded-xl p-5 transition"
          >
            <div className="text-3xl mb-2">🎞️</div>
            <div className="font-semibold text-white">Playlists</div>
            <div className="text-sm text-gray-400 mt-1">Inhalte planen</div>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
