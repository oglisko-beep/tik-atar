import type { Dispatch } from 'react'
import type { Block, BlockValue, ChecklistValues, ImageItem, KvValues, Row } from '../types'
import type { Action } from '../store/StoreContext'
import { KvBlock } from './KvBlock'
import { TableBlock } from './TableBlock'
import { ChecklistBlock } from './ChecklistBlock'
import { ImageBlock } from './ImageBlock'
import { BulletsBlock, BoxBlock, CalloutBlock } from './StaticBlocks'

export function BlockRenderer({
  block,
  values,
  dispatch,
  showExamples,
}: {
  block: Block
  values: Record<string, BlockValue>
  dispatch: Dispatch<Action>
  showExamples: boolean
}) {
  switch (block.kind) {
    case 'subhead':
      return (
        <div className="subhead">
          <h3>{block.text}</h3>
          {block.optional && <span className="opt">אופציונלי</span>}
        </div>
      )
    case 'note':
      return <p className="inline-note">{block.text}</p>
    case 'bullets':
      return (
        <div className="block">
          <BulletsBlock block={block} />
        </div>
      )
    case 'box':
      return (
        <div className="block">
          <BoxBlock block={block} />
        </div>
      )
    case 'callout':
      return (
        <div className="block">
          <CalloutBlock block={block} />
        </div>
      )
    case 'kv':
      return (
        <div className="block" id={`block-${block.id}`}>
          <KvBlock
            block={block}
            value={values[block.id] as KvValues | undefined}
            onChange={(fieldId, value) => dispatch({ type: 'SET_KV', blockId: block.id, fieldId, value })}
          />
        </div>
      )
    case 'checklist':
      return (
        <div className="block" id={`block-${block.id}`}>
          <ChecklistBlock
            block={block}
            value={values[block.id] as ChecklistValues | undefined}
            onChange={(rowId, colId, value) =>
              dispatch({ type: 'SET_CHECKLIST', blockId: block.id, rowId, colId, value })
            }
          />
        </div>
      )
    case 'table':
      return (
        <div className="block" id={`block-${block.id}`}>
          <TableBlock
            block={block}
            value={values[block.id] as Row[] | undefined}
            showExamples={showExamples}
            onChange={(rows) => dispatch({ type: 'SET_TABLE', blockId: block.id, rows })}
          />
        </div>
      )
    case 'image':
      return (
        <div className="block" id={`block-${block.id}`}>
          <ImageBlock
            block={block}
            value={values[block.id] as ImageItem[] | undefined}
            onChange={(images) => dispatch({ type: 'SET_IMAGES', blockId: block.id, images })}
          />
        </div>
      )
    default:
      return null
  }
}
