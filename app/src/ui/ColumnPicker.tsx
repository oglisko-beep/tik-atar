import { useState, type Dispatch } from 'react'
import type { Column } from '../types'
import type { Action } from '../store/StoreContext'
import { columnKey, type Excluded } from '../store/inclusion'
import { useClickOutside } from './useClickOutside'
import { IconColumns } from './icons'

/** Per-block column visibility popover. Presentational: it is handed the block's
 *  columns and the site's exclusions, and emits TOGGLE_COLUMN. */
export function ColumnPicker({
  blockId,
  columns,
  ex,
  dispatch,
}: {
  blockId: string
  columns: Column[]
  ex: Excluded
  dispatch: Dispatch<Action>
}) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

  const isHidden = (c: Column) => ex.columns.has(columnKey(blockId, c.id))
  const hiddenCount = columns.filter(isHidden).length
  const visibleCount = columns.length - hiddenCount

  return (
    <div className="colpick" ref={ref}>
      <button
        type="button"
        className="btn btn-sm"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconColumns /> עמודות{hiddenCount ? ` (${hiddenCount} מוסתרות)` : ''}
      </button>
      {open && (
        <div className="colpick-pop" role="group" aria-label="בחירת עמודות">
          {columns.map((c) => {
            const hidden = isHidden(c)
            // The last visible column may not be hidden — the reducer refuses it too.
            const locked = !hidden && visibleCount <= 1
            return (
              <label className="colpick-row" key={c.id}>
                <input
                  type="checkbox"
                  checked={!hidden}
                  disabled={locked}
                  aria-label={c.label}
                  onChange={() => dispatch({ type: 'TOGGLE_COLUMN', key: columnKey(blockId, c.id) })}
                />
                <span>{c.label}</span>
              </label>
            )
          })}
          <div className="colpick-foot">עמודות שהוסתרו — הנתונים בהן יישמרו.</div>
        </div>
      )}
    </div>
  )
}
