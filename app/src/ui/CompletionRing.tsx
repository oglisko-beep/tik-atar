export function CompletionRing({
  value,
  size = 34,
  stroke = 4,
  showText,
}: {
  value: number
  size?: number
  stroke?: number
  showText?: boolean
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100)
  const withText = showText ?? size >= 40
  return (
    <div className={'ring-wrap' + (size >= 44 ? ' lg' : '')} style={{ width: size, height: size }} title={`${value}% הושלם`}>
      <svg className={'ring' + (value >= 100 ? ' is-full' : '')} width={size} height={size}>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      {withText && <span className="ring-pct">{value}%</span>}
    </div>
  )
}
