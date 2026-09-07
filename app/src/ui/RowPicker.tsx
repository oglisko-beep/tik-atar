import type { Dispatch } from 'react'
import type { Action } from '../store/StoreContext'
import { rowKey, type Excluded } from '../store/inclusion'
import { VisibilityPicker } from './VisibilityPicker'
import { IconRows } from './icons'

/** Per-checklist row filter — lets a site drop a control that does not apply to it
 *  (e.g. «סקר ארכיטקטורת הגנה») from the table entirely. Emits TOGGLE_ROW. */
export function RowPicker({
  blockId,
  allRows,
  ex,
  dispatch,
}: {
  blockId: string
  allRows: readonly { id: string; label: string }[]
  ex: Excluded
  dispatch: Dispatch<Action>
}) {
  return (
    <VisibilityPicker
      icon={<IconRows />}
      label="שורות"
      groupLabel="בחירת שורות"
      lockedReason="לא ניתן להסתיר את השורה האחרונה הגלויה"
      footNote="שורות שהוסתרו — הנתונים בהן יישמרו."
      items={allRows.map((r) => ({ id: r.id, label: r.label }))}
      isHidden={(r) => ex.rows.has(rowKey(blockId, r.id))}
      onToggle={(r) => dispatch({ type: 'TOGGLE_ROW', key: rowKey(blockId, r.id) })}
    />
  )
}
