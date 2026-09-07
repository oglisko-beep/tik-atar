import type { ReactNode } from 'react'
import type { Block, ChecklistValues, Column } from '../types'
import { Field } from './Field'

type ChecklistBlockT = Extract<Block, { kind: 'checklist' }>

export function ChecklistBlock({
  block,
  cols,
  rows,
  value,
  onChange,
  pickerSlot,
}: {
  block: ChecklistBlockT
  cols: Column[]
  rows: { id: string; label: string }[]
  value: ChecklistValues | undefined
  onChange: (rowId: string, colId: string, value: string) => void
  pickerSlot?: ReactNode
}) {
  const v = value || {}
  return (
    <div className="card">
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th className="ctrl-label">{block.rowHeader}</th>
              {cols.map((c) => (
                <th key={c.id}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="ctrl-label">{r.label}</td>
                {cols.map((c) => (
                  <td key={c.id}>
                    <Field
                      compact
                      type={c.type}
                      value={v[r.id]?.[c.id] || ''}
                      placeholder={c.placeholder}
                      options={c.options}
                      ariaLabel={`${r.label} — ${c.label}`}
                      onChange={(val) => onChange(r.id, c.id, val)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pickerSlot && <div className="table-foot">{pickerSlot}</div>}
    </div>
  )
}
