import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useProfile } from '../../lib/profile'
import Layout from '../components/Layout'
import LocationPicker from '../components/LocationPicker'
import { METHOD_LABELS } from '../../lib/prayertimes'
import type { PrayerSource } from '../../types'
import { useCmsT } from '../../lib/cms-lang'

export default function Settings() {
  const { user } = useAuth()
  const { profile, refreshProfile } = useProfile()
  const t = useCmsT()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [prayerSource, setPrayerSource] = useState<PrayerSource | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setAddress(profile.address)
      setLogoUrl(profile.logo_url)
      // Prefer new prayer_source, fall back to legacy city_id
      setPrayerSource(
        profile.prayer_source ??
        (profile.city_id ? { source: 'diyanet', cityId: profile.city_id, cityName: profile.city_name ?? '' } : null)
      )
    }
  }, [profile])

  async function uploadLogo(file: File) {
    if (!user) return
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'webp'
    const path = `logos/${user.id}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, {
      upsert: true,
      contentType: file.type,
    })
    if (error) { setError(t.st.errUpload); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
    setLogoUrl(publicUrl)
    setUploading(false)
  }

  async function save() {
    if (!user) return
    if (!name.trim()) { setError(t.st.errName); return }
    setSaving(true); setError(null); setSaved(false)
    // Keep city_id / city_name in sync for backward compat (TV screen fallback)
    const legacyCityId   = prayerSource?.source === 'diyanet' ? prayerSource.cityId : null
    const legacyCityName = prayerSource?.source === 'diyanet' ? (prayerSource.cityName ?? null) : null

    const { error } = await supabase.from('mosque_profiles').upsert({
      user_id: user.id,
      name: name.trim(),
      address: address.trim(),
      logo_url: logoUrl,
      city_id: legacyCityId,
      city_name: legacyCityName,
      prayer_source: prayerSource ?? null,
    }, { onConflict: 'user_id' })
    if (error) { setError(error.message); setSaving(false); return }
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Layout>
      <div className="p-6 max-w-lg">
        <h1 className="text-white text-xl font-bold mb-6">{t.st.title}</h1>

        <div className="flex flex-col gap-5">
          {/* Logo */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-400 text-sm">{t.st.logo}</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  : <span className="text-2xl">🕌</span>
                }
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
                >
                  {uploading ? t.st.uploading : t.st.uploadLogo}
                </button>
                {logoUrl && (
                  <button onClick={() => setLogoUrl(null)}
                    className="text-xs text-gray-500 hover:text-red-400 transition text-left">
                    {t.st.removeLogo}
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-400 text-sm">{t.st.mosqueName}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="z.B. Islamisches Zentrum Hamburg"
              className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-400 text-sm">{t.st.address}</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="z.B. Musterstraße 1, 20095 Hamburg"
              className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
            />
          </div>

          {/* Prayer times source */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-400 text-sm">{t.st.prayerSource}</label>

            {/* Current source badge */}
            {!showLocationPicker && (
              prayerSource?.source === 'calculated' ? (
                <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-700/40 rounded-lg px-4 py-3">
                  <span className="text-blue-300">📐</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{prayerSource.locationName || '—'}</p>
                    <p className="text-blue-400 text-xs mt-0.5">{METHOD_LABELS[prayerSource.method] ?? prayerSource.method}</p>
                  </div>
                  <button onClick={() => setShowLocationPicker(true)}
                    className="text-xs text-gray-400 hover:text-gray-200 transition shrink-0">{t.st.changeCity}</button>
                </div>
              ) : prayerSource?.source === 'diyanet' ? (
                <div className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-4 py-3">
                  <span className="text-emerald-400">🕌</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{prayerSource.cityName || `ID: ${prayerSource.cityId}`}</p>
                    <p className="text-emerald-500 text-xs mt-0.5">Diyanet</p>
                  </div>
                  <button onClick={() => setShowLocationPicker(true)}
                    className="text-xs text-gray-400 hover:text-gray-200 transition shrink-0">{t.st.changeCity}</button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                  <span className="text-sm text-gray-500">{t.st.noCity}</span>
                  <button onClick={() => setShowLocationPicker(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition">{t.st.addCity}</button>
                </div>
              )
            )}

            {showLocationPicker && (
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <LocationPicker
                  current={prayerSource}
                  onSelect={src => { setPrayerSource(src); setShowLocationPicker(false) }}
                  onCancel={() => setShowLocationPicker(false)}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={save}
            disabled={saving || uploading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
          >
            {saving ? t.st.saving : saved ? t.st.saved : t.st.save}
          </button>
        </div>
      </div>
    </Layout>
  )
}
