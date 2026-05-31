import { StrictMode, Component, type ReactNode, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error('Root error:', e, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#09090b', color: '#fff', padding: '2rem', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h1 style={{ color: '#f87171', marginBottom: '1rem' }}>App-Fehler</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#fca5a5', fontSize: '0.85rem' }}>{this.state.error}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
