import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PairingScreen from './PairingScreen'
import ScreenPlayer from './ScreenPlayer'

type State = 'loading' | 'pairing' | 'playing'

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

export default function DisplayEntry() {
  const [state, setState] = useState<State>('loading')
  const hardwareId = getOrCreateHardwareId()

  useEffect(() => {
    async function checkPairing() {
      const { data } = await supabase
        .from('screens')
        .select('paired')
        .eq('hardware_id', hardwareId)
        .maybeSingle()

      if (data?.paired) {
        setState('playing')
      } else {
        setState('pairing')
      }
    }

    checkPairing()

    // Realtime: auf Kopplung warten
    const channel = supabase
      .channel(`display:${hardwareId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'screens',
        filter: `hardware_id=eq.${hardwareId}`,
      }, ({ new: row }) => {
        if ((row as { paired: boolean }).paired) {
          setState('playing')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [hardwareId])

  if (state === 'loading') {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'pairing') {
    return <PairingScreen hardwareId={hardwareId} onPaired={() => setState('playing')} />
  }

  return <ScreenPlayer hardwareId={hardwareId} />
}
