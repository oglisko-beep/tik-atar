import type { Section } from '../types'
import { useActiveSite, useStore } from '../store/StoreContext'
import { sectionCompletion, pct } from '../store/completion'
import { CompletionRing } from '../ui/CompletionRing'
import { BlockRenderer } from './BlockRenderer'
import { IconClipboard } from '../ui/icons'

export function SectionView({ section }: { section: Section }) {
  const { state, dispatch } = useStore()
  const site = useActiveSite()
  const values = site?.values || {}
  const showExamples = state.ui.showExamples
  const num = section.title.match(/^(\d+)\./)?.[1]
  const completion = pct(sectionCompletion(section, values))

  return (
    <div className="section-enter" key={section.id + (site?.id ?? '')}>
      <div className="section-head">
        <div className="num-chip">{num ?? <IconClipboard width={22} height={22} />}</div>
        <div className="grow">
          <div className="section-title">{section.title}</div>
          {section.note && <div className="section-note">{section.note}</div>}
        </div>
        <CompletionRing value={completion} size={52} stroke={5} showText />
      </div>

      {section.blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} values={values} dispatch={dispatch} showExamples={showExamples} />
      ))}
    </div>
  )
}
