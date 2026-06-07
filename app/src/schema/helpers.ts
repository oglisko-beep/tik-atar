import type { Column, FieldType, Row } from '../types'

type ColSpec = string | [string, Partial<{ type: FieldType; placeholder: string; options: string[] }>]

/** Build columns with auto ids c0..cn. `'label'` or `['label', { type, placeholder }]`. */
export function cols(...specs: ColSpec[]): Column[] {
  return specs.map((s, i) =>
    Array.isArray(s)
      ? { id: 'c' + i, label: s[0], type: 'text', ...s[1] }
      : { id: 'c' + i, label: s, type: 'text' },
  )
}

/** Build an example/seed row positionally against a column set. */
export function exRow(columns: Column[], ...vals: string[]): Row {
  const r: Row = {}
  columns.forEach((c, i) => {
    if (vals[i] != null) r[c.id] = vals[i]
  })
  return r
}
