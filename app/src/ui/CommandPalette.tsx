import { useEffect, useMemo, useState } from 'react'
import { doc } from '../schema'
import { IconSearch } from './icons'

interface Entry {
  label: string
  sectionId: string
  sectionTitle: string
  blockId?: string
  kind: string
}

function buildIndex(): Entry[] {
  const out: Entry[] = []
  for (const s of doc.sections) {
    out.push({ label: s.title, sectionId: s.id, sectionTitle: s.title, kind: 'פרק' })
    for (const b of s.blocks) {
      if (b.kind === 'subhead') out.push({ label: b.text, sectionId: s.id, sectionTitle: s.title, kind: 'תת-פרק' })
      if (b.kind === 'kv') b.fields.forEach((f) => out.push({ label: f.label, sectionId: s.id, sectionTitle: s.title, blockId: b.id, kind: 'שדה' }))
      if (b.kind === 'table') b.columns.forEach((c) => out.push({ label: c.label, sectionId: s.id, sectionTitle: s.title, blockId: b.id, kind: 'טור' }))
      if (b.kind === 'checklist') {
        b.rows.forEach((r) => out.push({ label: r.label, sectionId: s.id, sectionTitle: s.title, blockId: b.id, kind: 'בקרה' }))
        b.columns.forEach((c) => out.push({ label: c.label, sectionId: s.id, sectionTitle: s.title, blockId: b.id, kind: 'טור' }))
      }
    }
  }
  return out
}

export function CommandPalette({
  onClose,
  onNavigate,
}: {
  onClose: () => void
  onNavigate: (sectionId: string, blockId?: string) => void
}) {
  const index = useMemo(buildIndex, [])
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return index.filter((e) => e.kind === 'פרק')
    return index.filter((e) => e.label.toLowerCase().includes(t) || e.sectionTitle.toLowerCase().includes(t)).slice(0, 40)
  }, [q, index])

  useEffect(() => setI(0), [q])

  function choose(e?: Entry) {
    if (!e) return
    onNavigate(e.sectionId, e.blockId)
    onClose()
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setI((p) => Math.min(p + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setI((p) => Math.max(p - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[i])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-label="חיפוש בתיק">
        <div className="palette-input">
          <IconSearch width={20} height={20} />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input autoFocus placeholder="חפש פרק, שדה או בקרה…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />
          <span className="kbd">Esc</span>
        </div>
        <div className="palette-list">
          {results.length === 0 && <div className="palette-empty">לא נמצאו תוצאות עבור «{q}»</div>}
          {results.map((e, idx) => (
            <div
              key={idx}
              className={'palette-item' + (idx === i ? ' active' : '')}
              onMouseEnter={() => setI(idx)}
              onClick={() => choose(e)}
            >
              <span className="pi-kind kbd">{e.kind}</span>
              <span className="pi-label">{e.label}</span>
              <span className="pi-path">{e.sectionTitle}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
