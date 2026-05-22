import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Playlist, Screen, WidgetConfig, Slide } from '../types'
import WidgetRenderer from '../widgets/WidgetRenderer'
import SlideRenderer from '../slides/SlideRenderer'

interface Props {
  hardwareId: string
}

export default function ScreenPlayer({ hardwareId }: Props) {
  const [screen, setScreen] = useState<Screen | null>(null)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const playlistIdRef = React.useRef<string | null>(null)

  async function fetchPlaylist(playlistId: string) {
    const { data } = await supabase.from('playlists').select('*').eq('id', playlistId).single()
    if (data) setPlaylist(data as Playlist)
  }

  useEffect(() => {
    async function load() {
      const { data: screenData } = await supabase
        .from('screens')
        .select('*')
        .eq('hardware_id', hardwareId)
        .single()

      if (!screenData) return
      setScreen(screenData as Screen)

      if (screenData.playlist_id) {
        playlistIdRef.current = screenData.playlist_id
        fetchPlaylist(screenData.playlist_id)
      }
    }

    load()

    const heartbeat = setInterval(() => {
      supabase.from('screens').update({ last_seen_at: new Date().toISOString() }).eq('hardware_id', hardwareId)
    }, 60_000)

    const channel = supabase
      .channel(`player:${hardwareId}`)
      // Screen geändert (z.B. andere Playlist zugewiesen)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'screens',
        filter: `hardware_id=eq.${hardwareId}`,
      }, ({ new: updated }) => {
        const s = updated as Screen
        setScreen(s)
        if (s.playlist_id) {
          playlistIdRef.current = s.playlist_id
          fetchPlaylist(s.playlist_id)
        } else {
          playlistIdRef.current = null
          setPlaylist(null)
        }
      })
      // Playlist-Inhalt geändert (Slides, Widgets, Theme, ...)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'playlists',
      }, ({ new: updated }) => {
        if (updated.id === playlistIdRef.current) {
          setPlaylist(updated as Playlist)
        }
      })
      .subscribe()

    return () => {
      clearInterval(heartbeat)
      supabase.removeChannel(channel)
    }
  }, [hardwareId])

  if (!screen) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center text-gray-500">
        Keine Playlist zugewiesen
      </div>
    )
  }

  if (playlist.mode === 'slides') {
    return <SlidePlayer playlist={playlist} cityId={screen.city_id ?? 0} />
  }

  const isLandscape = screen.orientation === 'landscape'

  return (
    <div
      className={`h-screen w-screen overflow-hidden ${
        isLandscape
          ? 'grid grid-cols-12 grid-rows-6'
          : 'grid grid-cols-1 grid-rows-12'
      }`}
      style={{ background: '#0a0a0a' }}
    >
      {(playlist.widgets as WidgetConfig[]).map((widget) => (
        <div
          key={widget.id}
          style={
            isLandscape
              ? {
                  gridColumnStart: widget.col ?? 'auto',
                  gridColumnEnd: `span ${widget.colSpan ?? 4}`,
                  gridRowStart: widget.row ?? 'auto',
                  gridRowEnd: `span ${widget.rowSpan ?? 2}`,
                }
              : {
                  gridRowStart: widget.row ?? 'auto',
                  gridRowEnd: `span ${widget.rowSpan ?? 2}`,
                }
          }
        >
          <WidgetRenderer widget={widget} cityId={screen.city_id ?? 0} theme={playlist.theme} />
        </div>
      ))}
    </div>
  )
}

function SlidePlayer({ playlist, cityId }: { playlist: Playlist; cityId: number }) {
  const slides = (playlist.slides ?? []) as Slide[]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    const slide = slides[idx]
    const duration = slide.duration > 0 ? slide.duration : null
    if (!duration) return
    const id = setTimeout(() => setIdx(i => (i + 1) % slides.length), duration * 1000)
    return () => clearTimeout(id)
  }, [idx, slides])

  if (!slides.length) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center text-gray-500">
        Keine Slides in dieser Playlist
      </div>
    )
  }

  return <SlideRenderer slide={slides[idx]} cityId={cityId} />
}
