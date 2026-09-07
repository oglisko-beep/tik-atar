import type { Dispatch } from 'react'
import type { Column } from '../types'
import type { Action } from '../store/StoreContext'
import { columnKey, type Excluded } from '../store/inclusion'
import { VisibilityPicker } from './VisibilityPicker'
import { IconColumns } from './icons'

/** Per-block column filter. Presentational: it is handed the block's full column
 *  list and the site's exclusions, and emits TOGGLE_COLUMN. */
export function ColumnPicker({
  blockId,
  allColumns,
  ex,
  dispatch,
}: {
  blockId: string
  allColumns: Column[]
  ex: Excluded
  dispatch: Dispatch<Action>
}) {
  return (
    <VisibilityPicker
      icon={<IconColumns />}
      label="עמודות"
      groupLabel="בחירת עמודות"
      lockedReason="לא ניתן להסתיר את העמודה האחרונה הגלויה"
      footNote="עמודות שהוסתרו — הנתונים בהן יישמרו."
      items={allColumns.map((c) => ({ id: c.id, label: c.label }))}
      isHidden={(c) => ex.columns.has(columnKey(blockId, c.id))}
      onToggle={(c) => dispatch({ type: 'TOGGLE_COLUMN', key: columnKey(blockId, c.id) })}
    />
  )
}
