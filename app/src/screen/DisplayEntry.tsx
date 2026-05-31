import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { loadScreenConfig } from '../lib/offline-cache'
import PairingScreen from './PairingScreen'
import ScreenPlayer from './ScreenPlayer'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function getOrCreateHardwareId(): string {
  let id = localStorage.getItem('hardware_id')
  if (!id) {
    id = generateUUID()
    localStorage.setItem('hardware_id', id)
  }
  return id
}

type State = 'pairing' | 'playing'

export default function DisplayEntry() {
  const previewId = new URLSearchParams(window.location.search).get('preview')
  const [hardwareId] = useState(() => getOrCreateHardwareId())
  // Starte direkt mit 'pairing' — kein Netzwerk-abhängiger Loading-State
  const [state, setState] = useState<State>('pairing')
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    // 1. Sofort: Cache prüfen (kein Netzwerk)
    loadScreenConfig(hardwareId).then(cached => {
      if (cached?.screen?.paired) setState('playing')
    }).catch(() => {})

    // 2. Im Hintergrund: Supabase prüfen (mit Timeout)
    const timeout = setTimeout(() => {/* Timeout verstrichen, kein Problem */}, 4000)
    supabase
      .from('screens')
      .select('paired')
      .eq('hardware_id', hardwareId)
      .maybeSingle()
      .then(
        ({ data }: { data: { paired: boolean } | null }) => { clearTimeout(timeout); if (data?.paired) setState('playing') },
        () => clearTimeout(timeout)
      )

    // Realtime: auf Kopplung warten
    const channel = supabase
      .channel(`display:${hardwareId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'screens',
        filter: `hardware_id=eq.${hardwareId}`,
      }, ({ new: row }) => {
        if ((row as { paired: boolean }).paired) setState('playing')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [hardwareId])

  if (previewId) return <ScreenPlayer screenId={previewId} preview />

  if (state === 'pairing') {
    return <PairingScreen hardwareId={hardwareId} onPaired={() => setState('playing')} />
  }

  return <ScreenPlayer hardwareId={hardwareId} />
}
