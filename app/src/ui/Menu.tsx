import { useState } from 'react'
import { useActiveSite, useStore } from '../store/StoreContext'
import { isRemoteConfigured } from '../remote/config'
import { useClickOutside } from './useClickOutside'
import { exportSite, exportAll, parseImport, download, safeFileName } from '../store/exportImport'
import { IconLayers, IconDownload, IconUpload, IconPrinter, IconFileText, IconLogout } from './icons'

export function Menu() {
  const { state, dispatch, signOut } = useStore()
  const site = useActiveSite()
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

  function doImport() {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'application/json,.json'
    inp.onchange = () => {
      const f = inp.files?.[0]
      if (!f) return
      const r = new FileReader()
      r.onload = () => {
        const res = parseImport(String(r.result))
        if (res.kind === 'error') {
          alert('ייבוא נכשל: ' + res.message)
          return
        }
        if (res.kind === 'all') {
          if (window.confirm('ייבוא יחליף את כל האתרים הקיימים. להמשיך?'))
            dispatch({ type: 'IMPORT_STATE', state: res.state })
        } else {
          const s = res.site
          dispatch({
            type: 'IMPORT_STATE',
            state: { ...state, sites: { ...state.sites, [s.id]: s }, activeSiteId: s.id },
          })
        }
      }
      r.readAsText(f)
    }
    inp.click()
    setOpen(false)
  }

  return (
    <div className="dropdown-anchor" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="תפריט פעולות" title="ייצוא, ייבוא והדפסה">
        <IconLayers />
      </button>
      {open && (
        <div className="menu-pop">
          <div className="nav-group-label">ייצוא / ייבוא</div>
          <button
            className="menu-item"
            onClick={() => {
              if (site) download(safeFileName(site.meta.name) + '.json', exportSite(site))
              setOpen(false)
            }}
          >
            <IconDownload /> ייצוא אתר נוכחי (JSON)
          </button>
          <button
            className="menu-item"
            onClick={() => {
              download('tik-atar-all.json', exportAll(state))
              setOpen(false)
            }}
          >
            <IconDownload /> ייצוא כל האתרים
          </button>
          <button className="menu-item" onClick={doImport}>
            <IconUpload /> ייבוא מקובץ JSON
          </button>
          <div className="menu-sep" />
          <button
            className="menu-item"
            onClick={() => {
              setOpen(false)
              setTimeout(() => window.print(), 60)
            }}
          >
            <IconPrinter /> הדפסה / שמירה כ-PDF
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setOpen(false)
              import('../print/docxExport').then((m) => m.exportDocx(site))
            }}
          >
            <IconFileText /> ייצוא ל-Word (.docx)
          </button>
          {isRemoteConfigured() && (
            <>
              <div className="menu-sep" />
              <button className="menu-item" onClick={() => { setOpen(false); signOut() }}>
                <IconLogout /> התנתק / החלף משתמש
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
