import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../components/Layout'

interface MediaFile {
  name: string
  path: string
  size: number
  mimetype: string
  created_at: string
  publicUrl: string
}

const FOLDERS = ['backgrounds', 'logos']

export default function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const all: MediaFile[] = []
    for (const folder of FOLDERS) {
      const { data } = await supabase.storage.from('media').list(folder, {
        limit: 200, sortBy: { column: 'created_at', order: 'desc' },
      })
      if (!data) continue
      for (const f of data) {
        if (!f.name || f.name === '.emptyFolderPlaceholder') continue
        const path = `${folder}/${f.name}`
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
        all.push({
          name: f.name,
          path,
          size: f.metadata?.size ?? 0,
          mimetype: f.metadata?.mimetype ?? '',
          created_at: f.created_at ?? '',
          publicUrl,
        })
      }
    }
    all.sort((a, b) => b.created_at.localeCompare(a.created_at))
    setFiles(all)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteFile(file: MediaFile) {
    if (!window.confirm(`"${file.name}" wirklich löschen?`)) return
    setDeleting(file.path)
    await supabase.storage.from('media').remove([file.path])
    setFiles(prev => prev.filter(f => f.path !== file.path))
    setDeleting(null)
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const ext = file.name.split('.').pop() ?? 'bin'
    const contentType = file.type || (ext === 'mp3' ? 'audio/mpeg' : ext === 'aac' ? 'audio/aac' : ext === 'wav' ? 'audio/wav' : ext === 'm4a' ? 'audio/mp4' : 'application/octet-stream')
    const path = `backgrounds/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType })
    if (error) setUploadError(`Upload fehlgeschlagen: ${error.message}`)
    else await load()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isImage = (m: string) => m.startsWith('image/')
  const isVideo = (m: string) => m.startsWith('video/')
  const isAudio = (m: string) => m.startsWith('audio/')

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">Medienbibliothek</h1>
          {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}
          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition ${uploading ? 'bg-gray-700 text-gray-400' : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'}`}>
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Hochladen…</>
            ) : <><span>+</span><span className="hidden sm:inline">Datei hochladen</span><span className="sm:hidden">Hochladen</span></>}
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,audio/*,.mp3,.aac,.ogg,.wav,.m4a,.opus,.flac" className="hidden" disabled={uploading} onChange={upload} />
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-gray-500 text-sm">Noch keine Dateien — lade eine Datei hoch.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {files.map(f => (
              <div key={f.path} className="bg-gray-900 rounded-xl overflow-hidden flex flex-col group">
                {/* Vorschau */}
                <div className="relative bg-gray-800 aspect-video flex items-center justify-center overflow-hidden">
                  {isImage(f.mimetype) ? (
                    <img src={f.publicUrl} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : isVideo(f.mimetype) ? (
                    <video src={f.publicUrl} className="w-full h-full object-cover" muted />
                  ) : isAudio(f.mimetype) ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl">🎵</span>
                      <audio src={f.publicUrl} controls className="w-full max-w-[140px]" />
                    </div>
                  ) : (
                    <span className="text-3xl">📄</span>
                  )}
                  {/* Desktop hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition hidden sm:flex items-center justify-center">
                    <button onClick={() => copyUrl(f.publicUrl)}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition">
                      {copied === f.publicUrl ? '✓ Kopiert' : 'URL kopieren'}
                    </button>
                  </div>
                </div>
                {/* Info */}
                <div className="px-2.5 pt-2 pb-1 flex-1">
                  <p className="text-white text-xs font-medium truncate leading-snug" title={f.name}>{f.name}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{formatSize(f.size)}</p>
                </div>
                {/* Aktionen */}
                <div className="px-2.5 pb-2.5 flex gap-1.5">
                  <button onClick={() => copyUrl(f.publicUrl)}
                    className="flex-1 text-xs text-gray-400 hover:text-white active:text-emerald-400 bg-gray-800 hover:bg-gray-700 rounded-lg py-2 transition font-medium">
                    {copied === f.publicUrl ? '✓ Kopiert' : 'URL kopieren'}
                  </button>
                  <button onClick={() => deleteFile(f)} disabled={deleting === f.path}
                    className="text-xs text-gray-500 hover:text-red-400 active:text-red-400 disabled:opacity-40 bg-gray-800 hover:bg-gray-700 rounded-lg px-2.5 py-2 transition">
                    {deleting === f.path ? '…' : '🗑'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
