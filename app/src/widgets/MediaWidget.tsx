import { useState } from 'react'

interface Props {
  config: Record<string, unknown>
}

export default function MediaWidget({ config }: Props) {
  const url     = (config.url     as string) ?? ''
  const caption = (config.caption as string) ?? ''
  const fit     = (config.fit     as string) === 'contain' ? 'object-contain' : 'object-cover'

  const [loaded, setLoaded] = useState(false)
  const [error,  setError]  = useState(false)

  if (!url) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  const isVideo = /\.(mp4|webm|ogg)$/i.test(url)

  if (error) {
    return (
      <div className="h-full w-full bg-gray-900 flex flex-col items-center justify-center gap-2 text-gray-600">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span className="text-xs">Medien nicht verfügbar</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-gray-950 relative overflow-hidden">
      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-900 animate-pulse" />
      )}

      {isVideo ? (
        <video
          className={`h-full w-full ${fit}`}
          src={url}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : (
        <img
          className={`h-full w-full ${fit} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          src={url}
          alt={caption}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}

      {/* Optional caption overlay */}
      {caption && loaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
          <p className="text-white text-sm font-medium leading-snug">{caption}</p>
        </div>
      )}
    </div>
  )
}
