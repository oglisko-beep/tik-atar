import { useState, type ReactNode } from 'react'
import { useClickOutside } from './useClickOutside'

export interface PickerItem {
  id: string
  label: string
}

/** A popover of checkboxes that filter one dimension of a block — its columns or
 *  its rows. Presentational: it is handed the full item list plus which of them are
 *  hidden, and reports a toggle by item id. The last visible item is locked, because
 *  emptying a table is what excluding the whole sub-chapter is for.
 *
 *  `ColumnPicker` and `RowPicker` are the two thin bindings over this. */
export function VisibilityPicker({
  icon,
  label,
  groupLabel,
  lockedReason,
  footNote,
  items,
  isHidden,
  onToggle,
}: {
  icon: ReactNode
  label: string
  groupLabel: string
  lockedReason: string
  footNote: string
  items: PickerItem[]
  isHidden: (item: PickerItem) => boolean
  onToggle: (item: PickerItem) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

  const hiddenCount = items.filter(isHidden).length
  const visibleCount = items.length - hiddenCount

  return (
    <div className="colpick" ref={ref}>
      <button type="button" className="btn btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {icon} {label}
        {hiddenCount ? ` (${hiddenCount} מוסתרות)` : ''}
      </button>
      {open && (
        <div className="colpick-pop" role="group" aria-label={groupLabel}>
          {items.map((item) => {
            const hidden = isHidden(item)
            // Mirrors the reducer's guard, so the UI never offers a toggle it would refuse.
            const locked = !hidden && visibleCount <= 1
            return (
              <label className="colpick-row" key={item.id}>
                <input
                  type="checkbox"
                  checked={!hidden}
                  disabled={locked}
                  aria-label={locked ? `${item.label} — ${lockedReason}` : item.label}
                  onChange={() => onToggle(item)}
                />
                <span>{item.label}</span>
              </label>
            )
          })}
          <div className="colpick-foot">{footNote}</div>
        </div>
      )}
    </div>
  )
}
