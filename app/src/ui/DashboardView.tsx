import { useMemo } from 'react'
import { useStore } from '../store/StoreContext'
import { buildDashboard, relativeUpdated } from '../store/dashboard'
import { CompletionRing } from './CompletionRing'
import { IconCheck, IconX, IconMinus, IconShieldAlert } from './icons'

const STATUS_CLS: Record<string, string> = {
  'קיים': 'ok',
  'חלקי': 'warn',
  'חסר': 'bad',
  'לא רלוונטי': 'na',
}

function cellIcon(status: string) {
  if (status === 'קיים') return <IconCheck width={14} height={14} />
  if (status === 'חלקי') return <IconMinus width={14} height={14} />
  if (status === 'חסר') return <IconX width={14} height={14} />
  if (status === 'לא רלוונטי') return <span className="dash-na">—</span>
  return null
}

export function DashboardView({ onOpenSite }: { onOpenSite: (id: string) => void }) {
  const { state } = useStore()
  const d = useMemo(() => buildDashboard(state.sites, Date.now()), [state.sites])

  return (
    <div className="dash">
      <div className="dash-headline">
        <h1>דשבורד מנהלים</h1>
        <span className="dash-sub">סקירת כל האתרים · {new Date().toLocaleDateString('he-IL')}</span>
      </div>

      <div className="dash-kpis">
        <div className="dash-kpi"><div className="v">{d.kpis.siteCount}</div><div className="l">אתרים</div></div>
        <div className="dash-kpi"><div className="v">{d.kpis.avgCompletion}%</div><div className="l">השלמה ממוצעת</div></div>
        <div className="dash-kpi"><div className="v">{d.kpis.completed}</div><div className="l">הושלמו (≥90%)</div></div>
        <div className="dash-kpi"><div className="v">{d.kpis.needAttention}</div><div className="l">דורשים טיפול</div></div>
      </div>

      <section className="dash-block">
        <h2>אתרים</h2>
        <div className="dash-cards">
          {d.sites.map((s) => (
            <button key={s.id} className="dash-card" onClick={() => onOpenSite(s.id)}>
              <CompletionRing value={s.completion} size={48} stroke={5} showText />
              <div className="dash-card-body">
                <div className="dash-card-nm">{s.name}</div>
                <div className="dash-card-meta">
                  {s.classification && <span className="dash-badge">{s.classification}</span>}
                  <span>עודכן {relativeUpdated(s.updatedAt, Date.now())}</span>
                </div>
                {s.criticalGaps.length > 0 && (
                  <div className="dash-gaps"><IconShieldAlert width={13} height={13} /> {s.criticalGaps.length} פערים קריטיים</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="dash-block">
        <h2>מצב אבטחה — בקרות מול אתרים</h2>
        <div className="dash-matrix-wrap">
          <table className="dash-matrix">
            <thead>
              <tr>
                <th className="rh">בקרה</th>
                {d.security.siteOrder.map((s) => <th key={s.id} title={s.name}>{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {d.security.rows.map((row) => (
                <tr key={row.rowId}>
                  <th className={'rh' + (row.critical ? ' crit' : '')}>{row.label}</th>
                  {d.security.siteOrder.map((s) => {
                    const st = row.statuses[s.id] || ''
                    return (
                      <td key={s.id}>
                        <span className={'dash-cell ' + (STATUS_CLS[st] || 'empty')} title={st || '—'}>{cellIcon(st)}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dash-block">
        <h2>מלאי מצרפי</h2>
        <div className="dash-inv">
          <div className="dash-tile"><div className="v">{d.inventory.servers}</div><div className="l">שרתים</div></div>
          <div className="dash-tile"><div className="v">{d.inventory.endpoints}</div><div className="l">תחנות קצה</div></div>
          <div className="dash-tile"><div className="v">{d.inventory.network}</div><div className="l">ציוד תקשורת</div></div>
          <div className="dash-tile"><div className="v">{d.inventory.software}</div><div className="l">רישומי תוכנה</div></div>
        </div>
      </section>

      <section className="dash-block">
        <h2>דורש טיפול</h2>
        {d.attention.length === 0 ? (
          <div className="dash-empty">הכול תקין — אין פריטים הדורשים טיפול.</div>
        ) : (
          <div className="dash-att">
            {d.attention.map((a) => (
              <button key={a.siteId} className="dash-att-row" onClick={() => onOpenSite(a.siteId)}>
                <span className={'dash-dot ' + a.severity} />
                <span className="dash-att-who">{a.name}</span>
                <span className="dash-att-why">{a.reasons.join(' · ')}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
