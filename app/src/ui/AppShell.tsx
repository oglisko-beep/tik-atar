import { useEffect, useRef, useState } from 'react'
import { doc } from '../schema'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { SectionView } from '../engine/SectionView'

export function AppShell() {
  const [active, setActive] = useState('docControl')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const section = doc.sections.find((s) => s.id === active) ?? doc.sections[0]

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [active])

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
      <main className="app-main" ref={mainRef}>
        <div className="main-pad">
          <SectionView section={section} />
        </div>
      </main>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={navigate} />}
    </div>
  )
}
