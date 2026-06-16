import { useEffect, useRef, useState } from 'react'
import { doc } from '../schema'
import { useStore, useActiveSite } from '../store/StoreContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { SectionView } from '../engine/SectionView'
import { excludedOf, visibleSections } from '../store/inclusion'
import { ChapterManager } from './ChapterManager'
import { DashboardView } from './DashboardView'
import { IconEye, IconShieldAlert } from './icons'

export function AppShell() {
  const { readOnly, remoteStatus, signIn, dispatch } = useStore()
  const needsSignIn = remoteStatus === 'signedout'
  const site = useActiveSite()
  const [active, setActive] = useState('docControl')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const [dashboardMode, setDashboardMode] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const ex = excludedOf(site)
  const visible = visibleSections(doc, ex)
  const section = visible.find((s) => s.id === active) ?? visible[0]

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [active])

  // If the active section gets hidden, move to the first visible one.
  useEffect(() => {
    if (visible.length && !visible.some((s) => s.id === active)) setActive(visible[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, visible.map((s) => s.id).join(',')])

  // Lock editing for view-only users without blocking scroll: inert the content
  // (the fields), not the scroll container (main).
  useEffect(() => {
    const el = padRef.current
    if (!el) return
    if (readOnly) el.setAttribute('inert', '')
    else el.removeAttribute('inert')
  }, [readOnly])

  useEffect(() => {
    document.documentElement.dataset.view = dashboardMode ? 'dashboard' : 'site'
  }, [dashboardMode])

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
      <Header
        onMenu={() => setSidebarOpen((o) => !o)}
        onSearch={() => setPaletteOpen(true)}
        dashboardActive={dashboardMode}
        onToggleDashboard={() => setDashboardMode((m) => !m)}
      />
      <Sidebar
        active={active}
        onSelect={(id) => {
          setActive(id)
          setSidebarOpen(false)
          setDashboardMode(false)
        }}
        onManage={() => setChaptersOpen(true)}
      />
      <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      {readOnly && !dashboardMode && (
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
        ) : dashboardMode ? (
          <div className="main-pad">
            <DashboardView onOpenSite={(id) => { dispatch({ type: 'SELECT_SITE', id }); setDashboardMode(false) }} />
          </div>
        ) : visible.length === 0 ? (
          <div className="signin-gate">
            <IconEye width={44} height={44} />
            <h2>כל הפרקים הוסתרו</h2>
            <p>פתח את "תכולת התיק" כדי לכלול פרקים באתר זה.</p>
            <button className="btn btn-primary" onClick={() => setChaptersOpen(true)}>תכולת התיק</button>
          </div>
        ) : (
          <div className="main-pad" ref={padRef}>
            <SectionView section={section!} />
          </div>
        )}
      </main>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={navigate} />}
      {chaptersOpen && <ChapterManager onClose={() => setChaptersOpen(false)} />}
    </div>
  )
}
