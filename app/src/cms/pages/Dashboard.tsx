import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useProfile } from '../../lib/profile'
import { useCmsT } from '../../lib/cms-lang'

export default function Dashboard() {
  const { profile } = useProfile()
  const t = useCmsT()

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-8">
          {profile?.logo_url
            ? <img src={profile.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-cover" />
            : <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl">🕌</div>
          }
          <div>
            <h1 className="text-white text-xl font-bold">{profile?.name}</h1>
            {profile?.address && <p className="text-gray-500 text-sm">{profile.address}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link to="/admin/screens"
            className="bg-gray-900 hover:bg-gray-800 active:bg-gray-700 rounded-xl p-4 sm:p-5 transition flex flex-col">
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">📺</div>
            <div className="font-semibold text-white text-sm sm:text-base">{t.nav.screens}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1 leading-snug">{t.dash.manage}</div>
          </Link>
          <Link to="/admin/playlists"
            className="bg-gray-900 hover:bg-gray-800 active:bg-gray-700 rounded-xl p-4 sm:p-5 transition flex flex-col">
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🎞️</div>
            <div className="font-semibold text-white text-sm sm:text-base">{t.nav.playlists}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1 leading-snug">{t.dash.planContent}</div>
          </Link>
          <Link to="/admin/media"
            className="bg-gray-900 hover:bg-gray-800 active:bg-gray-700 rounded-xl p-4 sm:p-5 transition flex flex-col">
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">📁</div>
            <div className="font-semibold text-white text-sm sm:text-base">{t.nav.media}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1 leading-snug">{t.dash.imagesVideos}</div>
          </Link>
          <Link to="/admin/settings"
            className="bg-gray-900 hover:bg-gray-800 active:bg-gray-700 rounded-xl p-4 sm:p-5 transition flex flex-col">
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">⚙️</div>
            <div className="font-semibold text-white text-sm sm:text-base">{t.nav.settings}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1 leading-snug">{t.dash.profileLogo}</div>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
