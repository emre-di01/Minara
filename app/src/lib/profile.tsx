import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { MosqueProfile } from '../types'

interface ProfileCtx {
  profile: MosqueProfile | null
  profileLoading: boolean
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<ProfileCtx | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<MosqueProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  async function load() {
    if (!user) { setProfile(null); setProfileLoading(false); return }
    setProfileLoading(true)
    const { data } = await supabase
      .from('mosque_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    setProfile(data ?? null)
    setProfileLoading(false)
  }

  useEffect(() => { load() }, [user])

  return (
    <Ctx.Provider value={{ profile, profileLoading, refreshProfile: load }}>
      {children}
    </Ctx.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider')
  return ctx
}
