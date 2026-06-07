import { useStore } from '../store/StoreContext'
import { IconSun, IconMoon } from './icons'

export function ThemeToggle() {
  const { state, dispatch } = useStore()
  const dark = state.ui.theme === 'dark'
  return (
    <button
      className="icon-btn"
      title={dark ? 'מצב בהיר' : 'מצב כהה'}
      aria-label="החלף ערכת צבעים"
      onClick={() => dispatch({ type: 'SET_THEME', theme: dark ? 'light' : 'dark' })}
    >
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  )
}

export function SaveIndicator() {
  const { saving } = useStore()
  return (
    <span className={'save-indicator' + (saving ? ' saving' : '')} aria-live="polite">
      <span className="dot" />
      {saving ? 'שומר…' : 'נשמר'}
    </span>
  )
}
