import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Post {
  image_url: string
  caption?: string
  date?: string
  likes?: number
  permalink?: string
}

interface Props {
  handle?: string
  posts?: Post[]
  token?: string
}

const IG_GRADIENT = 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'

function usePortrait() {
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerWidth < window.innerHeight : false
  )
  useEffect(() => {
    function check() { setIsPortrait(window.innerWidth < window.innerHeight) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isPortrait
}

function InstagramIcon({ size = 60 }: { size?: number }) {
  // Wrapped in IG gradient square
  return (
    <div style={{
      width: size,
      height: size,
      minWidth: 60,
      minHeight: 60,
      borderRadius: size * 0.22,
      background: IG_GRADIENT,
      padding: size * 0.18,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#fff" strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="2" fill="none" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="#fff" />
      </svg>
    </div>
  )
}

export default function InstagramFeedSlide({ handle = '', posts = [], token = '' }: Props) {
  const isPortrait = usePortrait()
  const [livePosts, setLivePosts] = useState<Post[]>([])
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) return

    async function load() {
      setFetchState('loading')
      setErrorMsg('')
      try {
        const { data, error } = await supabase.functions.invoke('instagram-feed', {
          body: { token, limit: 8 },
        })
        if (error) throw new Error(error.message)
        if (data?.error) throw new Error(data.error)
        setLivePosts(data.posts ?? [])
        setFetchState('idle')
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setFetchState('error')
      }
    }

    load()
    const id = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [token])

  const allPosts = token ? livePosts : posts

  const maxPosts = isPortrait ? 2 : 4
  const visible = allPosts.slice(0, maxPosts)

  if (token && fetchState === 'loading' && livePosts.length === 0) {
    return <LoadingScreen handle={handle} />
  }

  if (token && fetchState === 'error' && livePosts.length === 0) {
    return <ErrorScreen handle={handle} message={errorMsg} />
  }

  if (visible.length === 0) {
    return <Placeholder handle={handle} />
  }

  // One post = full-screen cinematic, no top bar
  if (visible.length === 1) {
    return <SinglePost post={visible[0]} handle={handle} />
  }

  // 2/3/4 layouts share the same header
  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      userSelect: 'none',
      background: '#000',
      color: '#fff',
    }}>
      {/* Header */}
      <Header handle={handle} />

      {/* Posts */}
      <div style={{ flex: 1, padding: '2vh 2vw', display: 'flex', minHeight: 0 }}>
        {visible.length === 2 && <TwoPosts posts={visible} isPortrait={isPortrait} />}
        {visible.length === 3 && <ThreePosts posts={visible} isPortrait={isPortrait} />}
        {visible.length === 4 && <FourPosts posts={visible} isPortrait={isPortrait} />}
      </div>
    </div>
  )
}

// ─── Layouts ──────────────────────────────────────────────────────────────────

function LoadingScreen({ handle }: { handle: string }) {
  return (
    <div style={{ height: '100vh', width: '100vw', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4vh', userSelect: 'none' }}>
      <InstagramIcon size={120} />
      {handle && <div style={{ color: '#fff', fontSize: 'clamp(2rem,3.5vw,3.5rem)', fontWeight: 700 }}>{handle}</div>}
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ErrorScreen({ handle, message }: { handle: string; message: string }) {
  return (
    <div style={{ height: '100vh', width: '100vw', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh', userSelect: 'none', padding: '0 8vw' }}>
      <InstagramIcon size={100} />
      {handle && <div style={{ color: '#fff', fontSize: 'clamp(1.8rem,3vw,3rem)', fontWeight: 700 }}>{handle}</div>}
      <div style={{ color: 'rgba(255,100,100,0.9)', fontSize: 'clamp(1.2rem,2vw,1.8rem)', fontWeight: 300, textAlign: 'center', maxWidth: 600 }}>
        {message || 'Fehler beim Laden der Posts'}
      </div>
    </div>
  )
}

function Placeholder({ handle }: { handle: string }) {
  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4vh',
      userSelect: 'none',
    }}>
      <InstagramIcon size={140} />
      {handle && (
        <div style={{ color: '#fff', fontSize: 'clamp(2rem,3.5vw,3.5rem)', fontWeight: 700 }}>
          {handle}
        </div>
      )}
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(2.2rem,2.5vmin,2.5rem)', fontWeight: 300 }}>
        Noch keine Beiträge
      </div>
    </div>
  )
}

function Header({ handle }: { handle: string }) {
  return (
    <div style={{
      flexShrink: 0,
      padding: '2vh 3vw',
      display: 'flex',
      alignItems: 'center',
      gap: '1.5vw',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,0.7))',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <InstagramIcon size={70} />
      <div style={{
        color: '#fff',
        fontWeight: 700,
        fontSize: 'clamp(2.2rem,3vmin,3rem)',
        letterSpacing: '-0.01em',
      }}>
        {handle || '@instagram'}
      </div>
    </div>
  )
}

function SinglePost({ post, handle }: { post: Post; handle: string }) {
  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      userSelect: 'none',
      background: '#000',
    }}>
      {/* Background image */}
      <img
        src={post.image_url}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Top-left handle */}
      <div style={{
        position: 'absolute',
        top: '4vh',
        left: '3vw',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '1.5vw',
        padding: '1.5vh 2vw',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(10px)',
        borderRadius: '999px',
      }}>
        <InstagramIcon size={70} />
        <div style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: 'clamp(2.2rem,3vmin,3rem)',
        }}>
          {handle || '@instagram'}
        </div>
      </div>

      {/* Bottom overlay caption */}
      {(post.caption || post.likes !== undefined || post.date) && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '8vh 5vw 5vh',
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2vh',
        }}>
          {post.caption && (
            <p style={{
              color: '#fff',
              fontWeight: 400,
              fontSize: 'clamp(2.2rem,3.5vmin,3.5rem)',
              lineHeight: 1.35,
              margin: 0,
              maxWidth: '88vw',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {post.caption}
            </p>
          )}
          <PostMeta likes={post.likes} date={post.date} sizeBoost />
        </div>
      )}
    </div>
  )
}

function TwoPosts({ posts, isPortrait }: { posts: Post[]; isPortrait: boolean }) {
  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: isPortrait ? '1fr' : '1fr 1fr',
      gridTemplateRows: isPortrait ? '1fr 1fr' : '1fr',
      gap: '2vh 2vw',
    }}>
      {posts.map((post, i) => (
        <PostTile key={i} post={post} />
      ))}
    </div>
  )
}

function ThreePosts({ posts, isPortrait }: { posts: Post[]; isPortrait: boolean }) {
  if (isPortrait) {
    return (
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateRows: '1fr 1fr 1fr',
        gap: '2vh',
      }}>
        {posts.map((post, i) => <PostTile key={i} post={post} />)}
      </div>
    )
  }
  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '6fr 4fr',
      gap: '2vw',
    }}>
      <PostTile post={posts[0]} />
      <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '2vh' }}>
        {posts.slice(1).map((post, i) => <PostTile key={i} post={post} />)}
      </div>
    </div>
  )
}

function FourPosts({ posts, isPortrait }: { posts: Post[]; isPortrait: boolean }) {
  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: isPortrait ? '1fr' : '1fr 1fr',
      gridTemplateRows: isPortrait ? 'repeat(4, 1fr)' : '1fr 1fr',
      gap: '2vh 2vw',
    }}>
      {posts.map((post, i) => <PostTile key={i} post={post} />)}
    </div>
  )
}

function PostTile({ post }: { post: Post }) {
  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '1.5vw',
      background: '#111',
      minHeight: 0,
      minWidth: 0,
    }}>
      <img
        src={post.image_url}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {(post.caption || post.likes !== undefined || post.date) && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '4vh 2vw 2vh',
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 60%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1vh',
        }}>
          {post.caption && (
            <p style={{
              color: '#fff',
              fontWeight: 400,
              fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)',
              lineHeight: 1.3,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {post.caption}
            </p>
          )}
          <PostMeta likes={post.likes} date={post.date} />
        </div>
      )}
    </div>
  )
}

function PostMeta({ likes, date, sizeBoost = false }: { likes?: number; date?: string; sizeBoost?: boolean }) {
  if (likes === undefined && !date) return null
  const fontSize = sizeBoost ? 'clamp(2rem,2.5vmin,2.5rem)' : 'clamp(1.6rem,2vmin,2rem)'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2vw',
      color: 'rgba(255,255,255,0.85)',
      fontSize,
      fontWeight: 500,
    }}>
      {likes !== undefined && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5vw' }}>
          <span style={{ color: '#ff4b6e' }}>♥</span>
          <span>{likes.toLocaleString('de-DE')}</span>
        </span>
      )}
      {date && (
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{date}</span>
      )}
    </div>
  )
}
