import React, { Component, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  hardwareId: string
  onPaired: () => void
}

function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const CMS_BASE = `${window.location.protocol}//${window.location.host}/admin/screens`

// Fängt QR-Library-Fehler auf WebOS ab — zeigt dann einfach nichts
class QrErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

// Lazy import — crasht der Import, sieht man nur keinen QR-Code
function QrBlock({ value }: { value: string }) {
  const [QRCode, setQRCode] = useState<React.ComponentType<{ value: string; size: number }> | null>(null)
  useEffect(() => {
    import('react-qr-code').then(m => { setQRCode(() => m.default as React.ComponentType<{ value: string; size: number }>) }).catch(() => {})
  }, [])
  if (!QRCode) return null
  return (
    <div className="bg-white rounded-2xl p-4">
      <QRCode value={value} size={Math.min(window.innerWidth * 0.25, 200)} />
    </div>
  )
}

export default function PairingScreen({ hardwareId, onPaired }: Props) {
  const [code] = useState(() => generatePairingCode())
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    async function registerCode() {
      const { error } = await supabase
        .from('pairing_codes')
        .upsert(
          { code, hardware_id: hardwareId },
          { onConflict: 'hardware_id' }
        )
      if (error) {
        console.error('Pairing insert error:', error)
        setDbError(error.message)
      }
    }

    registerCode()

    const channel = supabase
      .channel(`pairing:${hardwareId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'screens',
        filter: `hardware_id=eq.${hardwareId}`,
      }, ({ new: row }) => {
        if ((row as { paired: boolean }).paired) onPaired()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [hardwareId, onPaired])

  const pairUrl = `${CMS_BASE}?pair=${code}`

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-10">
      <div className="text-center">
        <p className="text-gray-400 mb-6 tracking-widest uppercase text-sm">
          Screen koppeln
        </p>
        <div className="font-mono font-bold bg-gray-800 rounded-3xl select-none"
          style={{ fontSize: 'min(12vw, 6rem)', letterSpacing: '0.35em', padding: 'clamp(1rem, 3vw, 2rem) clamp(1.5rem, 4vw, 2.5rem)' }}>
          {code || '------'}
        </div>
        <p className="text-gray-600 text-sm mt-6">
          Code manuell eingeben oder QR-Code scannen
        </p>
        {dbError && (
          <p className="text-red-500 text-xs mt-4 font-mono max-w-sm break-all">
            DB Fehler: {dbError}
          </p>
        )}
      </div>

      <QrErrorBoundary>
        <QrBlock value={pairUrl} />
      </QrErrorBoundary>
    </div>
  )
}
