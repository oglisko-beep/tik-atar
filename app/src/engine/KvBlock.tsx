import type { KvValues } from '../types'
import type { Block } from '../types'
import { Field } from './Field'

type KvBlockT = Extract<Block, { kind: 'kv' }>

export function KvBlock({
  block,
  value,
  onChange,
}: {
  block: KvBlockT
  value: KvValues | undefined
  onChange: (fieldId: string, value: string) => void
}) {
  const v = value || {}
  return (
    <div className="card kv">
      {block.fields.map((f) => (
        <div className="kv-row" key={f.id}>
          <div className="kv-key">{f.label}</div>
          <div className="kv-val">
            <Field
              type={f.type}
              value={v[f.id] || ''}
              placeholder={f.placeholder}
              options={f.options}
              ariaLabel={f.label}
              onChange={(val) => onChange(f.id, val)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
