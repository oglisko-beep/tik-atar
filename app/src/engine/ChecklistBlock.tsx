import type { Block, ChecklistValues } from '../types'
import { Field } from './Field'

type ChecklistBlockT = Extract<Block, { kind: 'checklist' }>

export function ChecklistBlock({
  block,
  value,
  onChange,
}: {
  block: ChecklistBlockT
  value: ChecklistValues | undefined
  onChange: (rowId: string, colId: string, value: string) => void
}) {
  const v = value || {}
  return (
    <div className="card table-scroll">
      <table className="data">
        <thead>
          <tr>
            <th className="ctrl-label">{block.rowHeader}</th>
            {block.columns.map((c) => (
              <th key={c.id}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r) => (
            <tr key={r.id}>
              <td className="ctrl-label">{r.label}</td>
              {block.columns.map((c) => (
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
  )
}
