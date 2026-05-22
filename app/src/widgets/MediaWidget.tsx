interface Props {
  config: Record<string, unknown>
}

export default function MediaWidget({ config }: Props) {
  const url = config.url as string
  const isVideo = url?.match(/\.(mp4|webm|ogg)$/i)

  if (!url) return <div className="h-full w-full bg-gray-900" />

  if (isVideo) {
    return (
      <video
        className="h-full w-full object-cover"
        src={url}
        autoPlay
        loop
        muted
        playsInline
      />
    )
  }

  return (
    <img
      className="h-full w-full object-cover"
      src={url}
      alt=""
    />
  )
}
