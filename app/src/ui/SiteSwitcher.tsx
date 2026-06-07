import { useState } from 'react'
import { useActiveSite, useStore } from '../store/StoreContext'
import { useClickOutside } from './useClickOutside'
import { IconBuilding, IconChevronDown, IconCheck, IconFolderPlus, IconCopy, IconPencil, IconTrash } from './icons'

export function SiteSwitcher() {
  const { state, dispatch } = useStore()
  const site = useActiveSite()
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))
  const sites = Object.values(state.sites).sort((a, b) => a.meta.name.localeCompare(b.meta.name, 'he'))

  return (
    <div className="dropdown-anchor" ref={ref}>
      <button className="site-switch" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <IconBuilding width={17} height={17} />
        <span className="site-name">{site?.meta.name || '—'}</span>
        <span className="site-ver">v{site?.meta.version}</span>
        <IconChevronDown width={15} height={15} />
      </button>
      {open && (
        <div className="site-pop" role="listbox">
          <div className="nav-group-label">אתרים ({sites.length})</div>
          {sites.map((s) => (
            <button
              key={s.id}
              className={'menu-item' + (s.id === site?.id ? ' active' : '')}
              role="option"
              aria-selected={s.id === site?.id}
              onClick={() => {
                dispatch({ type: 'SELECT_SITE', id: s.id })
                setOpen(false)
              }}
            >
              <IconBuilding />
              <span className="grow">{s.meta.name}</span>
              {s.id === site?.id && <IconCheck width={15} height={15} />}
            </button>
          ))}
          <div className="menu-sep" />
          <button
            className="menu-item"
            onClick={() => {
              const n = window.prompt('שם האתר החדש:', 'אתר חדש')
              if (n !== null) dispatch({ type: 'NEW_SITE', name: n.trim() || 'אתר חדש' })
              setOpen(false)
            }}
          >
            <IconFolderPlus /> אתר חדש
          </button>
          <button
            className="menu-item"
            onClick={() => {
              const n = window.prompt('שם העותק:', `${site?.meta.name || ''} (עותק)`)
              if (n !== null) dispatch({ type: 'CLONE_SITE', name: n.trim() || undefined })
              setOpen(false)
            }}
          >
            <IconCopy /> שכפל אתר נוכחי
          </button>
          <button
            className="menu-item"
            onClick={() => {
              if (!site) return
              const n = window.prompt('שם חדש לאתר:', site.meta.name)
              if (n && n.trim()) dispatch({ type: 'RENAME_SITE', id: site.id, name: n.trim() })
              setOpen(false)
            }}
          >
            <IconPencil /> שנה שם
          </button>
          <button
            className="menu-item danger"
            onClick={() => {
              if (!site) return
              if (window.confirm(`למחוק את "${site.meta.name}"? פעולה זו אינה הפיכה.`))
                dispatch({ type: 'DELETE_SITE', id: site.id })
              setOpen(false)
            }}
          >
            <IconTrash /> מחק אתר
          </button>
        </div>
      )}
    </div>
  )
}
