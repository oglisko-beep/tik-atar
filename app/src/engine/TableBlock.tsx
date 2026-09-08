import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Block, Column, Row } from '../types'
import { Field } from './Field'
import { IconPlus, IconCopy, IconTrash, IconEyeOff, IconEye } from '../ui/icons'
import { rowsWithVisibleData } from '../store/inclusion'

type TableBlockT = Extract<Block, { kind: 'table' }>

function rid(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'r' + Math.random().toString(36).slice(2)
}
function emptyRow(): Row {
  return { _id: rid() }
}

export function TableBlock({
  block,
  cols,
  value,
  onChange,
  showExamples,
  pickerSlot,
  isRowHidden,
  onToggleRow,
}: {
  block: TableBlockT
  cols: Column[]
  value: Row[] | undefined
  onChange: (rows: Row[]) => void
  showExamples: boolean
  pickerSlot?: ReactNode
  /** Whether this site has hidden the row with the given `_id`. Omitted where
   *  hiding is not offered. */
  isRowHidden?: (rowId: string) => boolean
  onToggleRow?: (rowId: string) => void
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

  // Hidden rows are revealed on demand so they can be restored; otherwise they are gone.
  const [revealHidden, setRevealHidden] = useState(false)
  const isHidden = (r: Row) => !!r._id && !!isRowHidden?.(r._id)
  const hiddenCount = rows.filter(isHidden).length
  const display = revealHidden ? rows : rows.filter((r) => !isHidden(r))

  // Mutations address the full array by identity — display indices shift when rows hide.
  const setCell = (row: Row, colId: string, v: string) => {
    const i = rows.indexOf(row)
    const base = rows.map((r) => ({ ...r }))
    base[i] = { ...base[i], _id: base[i]._id ?? rid(), [colId]: v }
    onChange(base)
  }
  const addRow = () => onChange([...rows, emptyRow()])
  const dupRow = (row: Row) => {
    const i = rows.indexOf(row)
    const next = [...rows]
    next.splice(i + 1, 0, { ...rows[i], _id: rid() })
    onChange(next)
  }
  const delRow = (row: Row) => onChange(rows.filter((r) => r !== row))

  const filledCount = rowsWithVisibleData(display, cols).length

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
              <th aria-label="פעולות" style={{ width: 112 }} />
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
            {display.map((r, i) => {
              const rowHidden = isHidden(r)
              return (
                <tr key={r._id || i} className={rowHidden ? 'row-hidden' : undefined}>
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
                        onChange={(v) => setCell(r, c.id, v)}
                      />
                    </td>
                  ))}
                  <td>
                    <div className="row-actions">
                      {onToggleRow && (
                        <button
                          className="icon-btn"
                          title={rowHidden ? 'הצג שורה' : 'הסתר שורה (הנתונים יישמרו)'}
                          aria-label={rowHidden ? 'הצג שורה' : 'הסתר שורה'}
                          onClick={() => onToggleRow(r._id ?? '')}
                          disabled={!r._id}
                        >
                          {rowHidden ? <IconEye /> : <IconEyeOff />}
                        </button>
                      )}
                      <button className="icon-btn" title="שכפל שורה" onClick={() => dupRow(r)}>
                        <IconCopy />
                      </button>
                      <button className="icon-btn btn-danger" title="מחק שורה" onClick={() => delRow(r)}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {display.length === 0 && !(showExamples && block.examples?.length) && (
              <tr>
                <td colSpan={cols.length + 2} className="muted" style={{ textAlign: 'center', padding: 18 }}>
                  {hiddenCount ? 'כל השורות מוסתרות' : 'אין שורות — הוסיפו שורה למטה'}
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
        {pickerSlot}
        {hiddenCount > 0 && (
          <button className="btn btn-sm" aria-pressed={revealHidden} onClick={() => setRevealHidden((s) => !s)}>
            {revealHidden ? 'הסתר מוסתרות' : `מוסתרות (${hiddenCount})`}
          </button>
        )}
        <span className="muted" style={{ fontSize: 12 }}>
          {filledCount} שורות מלאות
        </span>
      </div>
    </div>
  )
}
