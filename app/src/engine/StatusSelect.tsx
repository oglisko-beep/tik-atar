import { STATUS_OPTIONS } from '../types'

const STATUS_CLASS: Record<string, string> = {
  קיים: 'ok',
  חלקי: 'warn',
  חסר: 'bad',
  'לא רלוונטי': 'na',
}

export function StatusSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel?: string
}) {
  const cls = STATUS_CLASS[value] || 'empty'
  return (
    <select
      className="status-native"
      data-status={cls}
      aria-label={ariaLabel}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— בחר —</option>
      {STATUS_OPTIONS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
