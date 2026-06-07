import { useMemo } from 'react'
import type { Block, Row } from '../types'
import { Field } from './Field'
import { IconPlus, IconCopy, IconTrash } from '../ui/icons'

type TableBlockT = Extract<Block, { kind: 'table' }>

function rid(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'r' + Math.random().toString(36).slice(2)
}
function emptyRow(): Row {
  return { _id: rid() }
}

export function TableBlock({
  block,
  value,
  onChange,
  showExamples,
}: {
  block: TableBlockT
  value: Row[] | undefined
  onChange: (rows: Row[]) => void
  showExamples: boolean
}) {
  // Rows shown before anything is stored: seedRows or `minRows` blank rows. Computed once.
  const seeded = useMemo<Row[]>(
    () =>
      block.seedRows?.map((r) => ({ ...r, _id: rid() })) ??
      Array.from({ length: Math.max(block.minRows ?? 0, 0) }, emptyRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const stored = value ?? []
  const rows = stored.length ? stored : seeded
  const cols = block.columns

  const setCell = (i: number, colId: string, v: string) => {
    const base = rows.map((r) => ({ ...r }))
    base[i] = { ...base[i], _id: base[i]._id ?? rid(), [colId]: v }
    onChange(base)
  }
  const addRow = () => onChange([...rows, emptyRow()])
  const dupRow = (i: number) => {
    const next = [...rows]
    next.splice(i + 1, 0, { ...rows[i], _id: rid() })
    onChange(next)
  }
  const delRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  const filledCount = rows.filter((r) => cols.some((c) => r[c.id]?.trim())).length

  return (
    <div className="card">
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th className="col-idx">#</th>
              {cols.map((c) => (
                <th key={c.id}>{c.label}</th>
              ))}
              <th aria-label="פעולות" style={{ width: 84 }} />
            </tr>
          </thead>
          <tbody>
            {showExamples &&
              block.examples?.map((ex, ei) => (
                <tr className="example-row" key={'ex' + ei}>
                  <td className="col-idx">
                    <span className="example-tag">דוגמה</span>
                  </td>
                  {cols.map((c) => (
                    <td key={c.id}>{ex[c.id] || ''}</td>
                  ))}
                  <td />
                </tr>
              ))}
            {rows.map((r, i) => (
              <tr key={r._id || i}>
                <td className="col-idx">{i + 1}</td>
                {cols.map((c) => (
                  <td key={c.id}>
                    <Field
                      compact
                      type={c.type}
                      value={r[c.id] || ''}
                      placeholder={c.placeholder}
                      options={c.options}
                      ariaLabel={c.label}
                      onChange={(v) => setCell(i, c.id, v)}
                    />
                  </td>
                ))}
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="שכפל שורה" onClick={() => dupRow(i)}>
                      <IconCopy />
                    </button>
                    <button className="icon-btn btn-danger" title="מחק שורה" onClick={() => delRow(i)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !(showExamples && block.examples?.length) && (
              <tr>
                <td colSpan={cols.length + 2} className="muted" style={{ textAlign: 'center', padding: 18 }}>
                  אין שורות — הוסיפו שורה למטה
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <button className="btn btn-sm add-row-btn" onClick={addRow}>
          <IconPlus /> הוסף שורה
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          {filledCount} שורות מלאות
        </span>
      </div>
    </div>
  )
}
