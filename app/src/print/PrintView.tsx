import { doc } from '../schema'
import { useActiveSite } from '../store/StoreContext'
import { excludedOf, visibleSections, visibleBlocks } from '../store/inclusion'
import type { Block, BlockValue, ChecklistValues, ImageItem, KvValues, Row } from '../types'

function PrintBlock({ block, values }: { block: Block; values: Record<string, BlockValue> }) {
  switch (block.kind) {
    case 'subhead':
      return <h3 className="pv-subhead">{block.text}</h3>
    case 'note':
      return <p className="pv-inline-note">{block.text}</p>
    case 'bullets':
      return (
        <ul className="pv-bullets">
          {block.items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )
    case 'box':
      return <div className="pv-box">{block.lines.join('  ')}</div>
    case 'callout':
      return (
        <div className="pv-callout">
          <b>{block.title}</b>
          <ul>
            {block.items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )
    case 'kv': {
      const v = (values[block.id] as KvValues) || {}
      return (
        <table className="pv-kv">
          <tbody>
            {block.fields.map((f) => (
              <tr key={f.id}>
                <th>{f.label}</th>
                <td>{v[f.id] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'checklist': {
      const v = (values[block.id] as ChecklistValues) || {}
      return (
        <table className="pv-table">
          <thead>
            <tr>
              <th>{block.rowHeader}</th>
              {block.columns.map((c) => (
                <th key={c.id}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.label}</td>
                {block.columns.map((c) => (
                  <td key={c.id}>{v[r.id]?.[c.id] || ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'table': {
      const all = (values[block.id] as Row[]) || []
      const rows = all.filter((r) => block.columns.some((c) => r[c.id]?.trim()))
      return (
        <table className="pv-table">
          <thead>
            <tr>
              {block.columns.map((c) => (
                <th key={c.id}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r, i) => (
                <tr key={i}>
                  {block.columns.map((c) => (
                    <td key={c.id}>{r[c.id] || ''}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="pv-empty" colSpan={block.columns.length}>
                  — לא הוזן —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )
    }
    case 'image': {
      const imgs = (values[block.id] as ImageItem[]) || []
      if (!imgs.length) return null
      return (
        <div className="pv-images">
          {imgs.map((im) => (
            <figure className="pv-image" key={im.id}>
              <img src={im.dataUrl} alt={im.name} />
              <figcaption>{im.name}</figcaption>
            </figure>
          ))}
        </div>
      )
    }
    default:
      return null
  }
}

export function PrintView() {
  const site = useActiveSite()
  if (!site) return null
  const v = site.values
  const ex = excludedOf(site)
  const details = (v['site-details'] as KvValues) || {}
  const today = new Date().toLocaleDateString('he-IL')

  return (
    <div className="print-view">
      <div className="pv-cover">
        <img src="./gav-yam.svg" alt="גב-ים" className="pv-logo" />
        <h1>תיק אתר — מערכות מידע</h1>
        <div className="pv-sub">{details.name || site.meta.name}</div>
        <table className="pv-meta">
          <tbody>
            <tr>
              <th>שם האתר</th>
              <td>{details.name || site.meta.name}</td>
            </tr>
            <tr>
              <th>קוד אתר</th>
              <td>{details.code || site.meta.code}</td>
            </tr>
            <tr>
              <th>גרסה</th>
              <td>{site.meta.version}</td>
            </tr>
            <tr>
              <th>סיווג</th>
              <td>{site.meta.classification}</td>
            </tr>
            <tr>
              <th>תאריך הפקה</th>
              <td>{today}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {visibleSections(doc, ex).map((s) => (
        <section className="pv-section" key={s.id}>
          <h2>{s.title}</h2>
          {s.note && <p className="pv-note">{s.note}</p>}
          {visibleBlocks(s, ex).map((b, i) => (
            <PrintBlock key={i} block={b} values={v} />
          ))}
        </section>
      ))}

      <div className="pv-footer-note">
        סיווג: {site.meta.classification} · הופק ב-{today} · גב-ים — מערכות מידע
      </div>
    </div>
  )
}
