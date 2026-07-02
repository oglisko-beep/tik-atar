import type { FieldType } from '../types'
import { validate, requiredEmpty } from '../store/validation'
import { StatusSelect } from './StatusSelect'

export interface FieldProps {
  type: FieldType
  value: string
  onChange: (v: string) => void
  placeholder?: string
  options?: string[]
  ariaLabel?: string
  required?: boolean
  /** In dense table/checklist cells, suppress the message line (red border + tooltip only). */
  compact?: boolean
}

export function Field({ type, value, onChange, placeholder, options, ariaLabel, required, compact }: FieldProps) {
  if (type === 'status') {
    return <StatusSelect value={value} onChange={onChange} ariaLabel={ariaLabel} />
  }

  const res = validate(type, value)
  const invalid = !res.valid
  const reqEmpty = !invalid && requiredEmpty(required, value)

  if (type === 'textarea') {
    return (
      <div className="field-cell">
        <textarea
          className={'textarea' + (invalid ? ' invalid' : reqEmpty ? ' req-empty' : '')}
          placeholder={placeholder}
          aria-label={ariaLabel}
          title={invalid ? res.message : undefined}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {!compact && invalid && <span className="field-warn">⚠ {res.message}</span>}
        {!compact && reqEmpty && <span className="field-req">נדרש</span>}
      </div>
    )
  }

  if (type === 'select' && options) {
    return (
      <select
        className={'select' + (reqEmpty ? ' req-empty' : '')}
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
        className={'input' + (invalid ? ' invalid' : reqEmpty ? ' req-empty' : '')}
        placeholder={placeholder}
        aria-label={ariaLabel}
        title={invalid ? res.message : undefined}
        inputMode={type === 'ip' ? 'decimal' : undefined}
        dir={type === 'email' || type === 'ip' ? 'ltr' : undefined}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {!compact && invalid && <span className="field-warn">⚠ {res.message}</span>}
      {!compact && reqEmpty && <span className="field-req">נדרש</span>}
    </div>
  )
}
