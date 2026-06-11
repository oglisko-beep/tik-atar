import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { SiteSwitcher } from './SiteSwitcher'
import { ThemeToggle, SaveIndicator } from './ThemeToggle'
import { Menu } from './Menu'
import { ShareControls } from './ShareControls'
import { IconMenu, IconSearch, IconEye } from './icons'

export function Header({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { state, dispatch } = useStore()
  const [logoOk, setLogoOk] = useState(true)
  const showEx = state.ui.showExamples

  return (
    <header className="app-header">
      <button className="icon-btn hamburger" onClick={onMenu} aria-label="פתח תפריט צד">
        <IconMenu />
      </button>

      <div className="brand">
        {logoOk ? (
          <img src="./gav-yam.svg" alt="גב-ים" onError={() => setLogoOk(false)} />
        ) : (
          <span className="brand-fallback">גב-ים</span>
        )}
      </div>
      <div className="header-divider" />
      <div className="doc-title">
        תיק אתר — מערכות מידע
        <div className="doc-sub">מערכת אינטראקטיבית · 2026</div>
      </div>

      <div className="header-grow" />

      <button className="search-btn" onClick={onSearch} aria-label="חיפוש בתיק">
        <IconSearch width={17} height={17} />
        <span className="stxt">חיפוש בתיק…</span>
        <span className="kbd">Ctrl K</span>
      </button>

      <SiteSwitcher />

      <button
        className={'icon-btn' + (showEx ? ' on' : '')}
        title={showEx ? 'הסתר דוגמאות' : 'הצג דוגמאות'}
        aria-pressed={showEx}
        onClick={() => dispatch({ type: 'TOGGLE_EXAMPLES' })}
      >
        <IconEye />
      </button>

      <ThemeToggle />
      <Menu />
      <ShareControls />
      <div className="header-divider" />
      <SaveIndicator />
    </header>
  )
}
