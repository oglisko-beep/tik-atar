import { doc } from '../schema'
import { useActiveSite, useStore } from '../store/StoreContext'
import { overallCompletion, sectionCompletion, pct } from '../store/completion'
import { CompletionRing } from './CompletionRing'

export function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const { state } = useStore()
  const site = useActiveSite()
  const values = site?.values || {}
  const overall = pct(overallCompletion(doc, values))

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
      <div className="nav-group-label">פרקים</div>
      {doc.sections.map((s) => {
        const c = pct(sectionCompletion(s, values))
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
