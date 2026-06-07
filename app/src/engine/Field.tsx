import type { FieldType } from '../types'
import { validate } from '../store/validation'
import { StatusSelect } from './StatusSelect'

export interface FieldProps {
  type: FieldType
  value: string
  onChange: (v: string) => void
  placeholder?: string
  options?: string[]
  ariaLabel?: string
  /** In dense table/checklist cells, suppress the message line (red border + tooltip only). */
  compact?: boolean
}

export function Field({ type, value, onChange, placeholder, options, ariaLabel, compact }: FieldProps) {
  if (type === 'status') {
    return <StatusSelect value={value} onChange={onChange} ariaLabel={ariaLabel} />
  }

  const res = validate(type, value)
  const invalid = !res.valid

  if (type === 'textarea') {
    return (
      <div className="field-cell">
        <textarea
          className={'textarea' + (invalid ? ' invalid' : '')}
          placeholder={placeholder}
          aria-label={ariaLabel}
          title={invalid ? res.message : undefined}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {!compact && invalid && <span className="field-warn">⚠ {res.message}</span>}
      </div>
    )
  }

  if (type === 'select' && options) {
    return (
      <select
        className="select"
        aria-label={ariaLabel}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" />
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className="field-cell">
      <input
        type={type === 'email' ? 'email' : 'text'}
        className={'input' + (invalid ? ' invalid' : '')}
        placeholder={placeholder}
        aria-label={ariaLabel}
        title={invalid ? res.message : undefined}
        inputMode={type === 'ip' ? 'decimal' : undefined}
        dir={type === 'email' || type === 'ip' ? 'ltr' : undefined}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {!compact && invalid && <span className="field-warn">⚠ {res.message}</span>}
    </div>
  )
}
