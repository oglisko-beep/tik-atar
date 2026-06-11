import { doc } from '../schema'
import { useActiveSite, useStore } from '../store/StoreContext'
import { overallCompletion, sectionCompletion, pct } from '../store/completion'
import { CompletionRing } from './CompletionRing'
import { excludedOf, visibleSections } from '../store/inclusion'
import { IconSliders } from './icons'

export function Sidebar({ active, onSelect, onManage }: { active: string; onSelect: (id: string) => void; onManage?: () => void }) {
  const { state } = useStore()
  const site = useActiveSite()
  const values = site?.values || {}
  const ex = excludedOf(site)
  const overall = pct(overallCompletion(doc, values, ex))

  return (
    <aside className="app-sidebar">
      <div className="sidebar-head">
        <div className="overall-card">
          <CompletionRing value={overall} size={52} stroke={6} showText />
          <div className="meta">
            <b>השלמת התיק</b>
            <span>{site?.meta.name || '—'}</span>
          </div>
        </div>
      </div>
      <div className="nav-group-head">
        <span className="nav-group-label">פרקים</span>
        <button className="icon-btn nav-manage" title="תכולת התיק — בחר פרקים" aria-label="תכולת התיק" onClick={() => onManage?.()}>
          <IconSliders width={17} height={17} />
        </button>
      </div>
      {visibleSections(doc, ex).map((s) => {
        const c = pct(sectionCompletion(s, values, ex))
        const num = s.title.match(/^(\d+)\./)?.[1]
        const label = s.title.replace(/^\d+\.\s*/, '')
        return (
          <button
            key={s.id}
            className={'nav-item' + (s.id === active ? ' active' : '')}
            onClick={() => onSelect(s.id)}
            aria-current={s.id === active}
          >
            <span className="nav-num">{num ?? '•'}</span>
            <span className="nav-label">{label}</span>
            <CompletionRing value={c} size={26} stroke={3} />
          </button>
        )
      })}
    </aside>
  )
}
