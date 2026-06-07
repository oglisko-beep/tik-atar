import type { Block } from '../types'
import { IconNetwork, IconShieldAlert } from '../ui/icons'

type BulletsT = Extract<Block, { kind: 'bullets' }>
type BoxT = Extract<Block, { kind: 'box' }>
type CalloutT = Extract<Block, { kind: 'callout' }>

export function BulletsBlock({ block }: { block: BulletsT }) {
  return (
    <div>
      {block.title && <div className="bullets-title">{block.title}</div>}
      <div className="bullets">
        {block.items.map((t, i) => (
          <span className="chip" key={i}>
            <span className="dot" />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

export function BoxBlock({ block }: { block: BoxT }) {
  return (
    <div className="box">
      <div className="box-ico">
        <IconNetwork width={30} height={30} />
      </div>
      {block.lines.map((l, i) => (
        <div key={i} style={{ fontWeight: i === 0 ? 600 : 400 }}>
          {l}
        </div>
      ))}
    </div>
  )
}

export function CalloutBlock({ block }: { block: CalloutT }) {
  return (
    <div className={'callout' + (block.tone === 'warn' ? ' warn' : '')}>
      <div className="ico">
        <IconShieldAlert width={22} height={22} />
      </div>
      <div>
        <div className="c-title">{block.title}</div>
        <ul>
          {block.items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
