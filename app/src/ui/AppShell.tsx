import { useEffect, useRef, useState } from 'react'
import { doc } from '../schema'
import { useStore } from '../store/StoreContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { SectionView } from '../engine/SectionView'
import { IconEye, IconShieldAlert } from './icons'

export function AppShell() {
  const { readOnly, remoteStatus, signIn } = useStore()
  const needsSignIn = remoteStatus === 'signedout'
  const [active, setActive] = useState('docControl')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const section = doc.sections.find((s) => s.id === active) ?? doc.sections[0]

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [active])

  // Lock editing for view-only users without blocking scroll: inert the content
  // (the fields), not the scroll container (main).
  useEffect(() => {
    const el = padRef.current
    if (!el) return
    if (readOnly) el.setAttribute('inert', '')
    else el.removeAttribute('inert')
  }, [readOnly])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function navigate(sectionId: string, blockId?: string) {
    setActive(sectionId)
    setPaletteOpen(false)
    setSidebarOpen(false)
    if (blockId) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = document.getElementById('block-' + blockId)
          if (!el) return
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('flash')
          setTimeout(() => el.classList.remove('flash'), 1300)
        }),
      )
    }
  }

  return (
    <div className="app-shell" data-sidebar={sidebarOpen ? 'open' : undefined}>
      <Header onMenu={() => setSidebarOpen((o) => !o)} onSearch={() => setPaletteOpen(true)} />
      <Sidebar
        active={active}
        onSelect={(id) => {
          setActive(id)
          setSidebarOpen(false)
        }}
      />
      <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      {readOnly && (
        <div className="readonly-banner" role="status">
          <IconEye width={16} height={16} />
          <span>מצב צפייה בלבד — אין לך הרשאת עריכה לאתר זה. שינויים לא יישמרו.</span>
        </div>
      )}
      <main className="app-main" ref={mainRef}>
        {needsSignIn ? (
          <div className="signin-gate">
            <IconShieldAlert width={44} height={44} />
            <h2>התחברות נדרשת</h2>
            <p>התחבר עם חשבון הארגון כדי לטעון את נתוני התיק מ‑SharePoint.</p>
            <button className="btn btn-primary" onClick={signIn}>התחבר</button>
          </div>
        ) : (
          <div className="main-pad" ref={padRef}>
            <SectionView section={section} />
          </div>
        )}
      </main>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={navigate} />}
    </div>
  )
}
