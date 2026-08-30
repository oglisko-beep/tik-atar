import { useState } from 'react'
import { doc } from '../schema'
import { useStore, useActiveSite } from '../store/StoreContext'
import { excludedOf, subsectionsOf, columnarBlocksOf, columnKey } from '../store/inclusion'
import { IconX, IconChevronDown, IconCheck } from './icons'

export function ChapterManager({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore()
  const site = useActiveSite()
  const ex = excludedOf(site)
  // Keyed by section id AND subhead id — disjoint keyspaces (subhead ids always contain '#').
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const allSecIds = doc.sections.map((s) => s.id)
  const allSubIds = doc.sections.flatMap((s) => subsectionsOf(s).map((x) => x.id))

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm" role="dialog" aria-label="תכולת התיק">
        <div className="cm-head">
          <div>
            <div className="cm-title">תכולת התיק — פרקים</div>
            <div className="cm-sub">בחר אילו פרקים ותתי-פרקים ייכללו באתר «{site?.meta.name || '—'}»</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="סגור"><IconX /></button>
        </div>
        <div className="cm-tools">
          <button className="cm-link" onClick={() => dispatch({ type: 'SET_INCLUSION', sections: [], subsections: [], columns: [] })}>בחר הכול</button>
          <button className="cm-link" onClick={() => dispatch({ type: 'SET_INCLUSION', sections: allSecIds, subsections: allSubIds, columns: [] })}>נקה הכול</button>
        </div>
        <div className="cm-list">
          {doc.sections.map((s) => {
            const secOn = !ex.sections.has(s.id)
            const subs = subsectionsOf(s)
            const num = s.title.match(/^(\d+)\./)?.[1]
            const label = s.title.replace(/^\d+\.\s*/, '')
            const columnarBlocks = columnarBlocksOf(s)
            return (
              <div key={s.id}>
                <div className="cm-row">
                  <button className={'cm-check' + (secOn ? ' on' : '')} aria-pressed={secOn} aria-label={label} onClick={() => dispatch({ type: 'TOGGLE_SECTION', sectionId: s.id })}>
                    {secOn && <IconCheck width={14} height={14} />}
                  </button>
                  <span className="cm-num">{num ?? '•'}</span>
                  <span className="cm-nm">{label}</span>
                  {subs.length > 0 && (
                    <button className={'cm-exp' + (open[s.id] ? ' open' : '')} aria-label="הצג תתי-פרקים" onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}>
                      <IconChevronDown width={16} height={16} />
                    </button>
                  )}
                </div>
                {open[s.id] && subs.map((sub) => {
                  const subOn = !ex.subsections.has(sub.id)
                  const blocks = columnarBlocks.filter((b) => b.subId === sub.id)
                  return (
                    <div key={sub.id}>
                      <div className="cm-row cm-sub">
                        <button className={'cm-check' + (subOn ? ' on' : '')} aria-pressed={subOn} aria-label={sub.text} onClick={() => dispatch({ type: 'TOGGLE_SUBSECTION', subId: sub.id })}>
                          {subOn && <IconCheck width={13} height={13} />}
                        </button>
                        <span className="cm-nm">{sub.text}</span>
                        {blocks.length > 0 && subOn && (
                          <button className={'cm-exp' + (open[sub.id] ? ' open' : '')} aria-label="הצג עמודות" onClick={() => setOpen((o) => ({ ...o, [sub.id]: !o[sub.id] }))}>
                            <IconChevronDown width={15} height={15} />
                          </button>
                        )}
                      </div>
                      {open[sub.id] && subOn && blocks.map((b) => {
                        const visible = b.columns.filter((c) => !ex.columns.has(columnKey(b.blockId, c.id)))
                        return (
                          <div key={b.blockId}>
                            <div className="cm-row cm-blk"><span className="cm-nm">{b.label}</span></div>
                            {b.columns.map((c) => {
                              const key = columnKey(b.blockId, c.id)
                              const on = !ex.columns.has(key)
                              const locked = on && visible.length <= 1
                              return (
                                <div className="cm-row cm-col" key={c.id}>
                                  <button
                                    className={'cm-check' + (on ? ' on' : '') + (locked ? ' locked' : '')}
                                    aria-pressed={on}
                                    aria-label={locked ? `${c.label} — לא ניתן להסתיר את העמודה האחרונה הגלויה` : c.label}
                                    disabled={locked}
                                    onClick={() => dispatch({ type: 'TOGGLE_COLUMN', key })}
                                  >
                                    {on && <IconCheck width={12} height={12} />}
                                  </button>
                                  <span className="cm-nm">{c.label}</span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="cm-foot">פרקים שלא סומנו יוסתרו מהאתר ומהיצוא — הנתונים יישמרו.</div>
      </div>
    </div>
  )
}
