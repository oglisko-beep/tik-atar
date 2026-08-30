import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColumnPicker } from './ColumnPicker'
import type { Column } from '../types'

const cols: Column[] = [
  { id: 'c0', label: 'שם', type: 'text' },
  { id: 'c1', label: 'תוקף', type: 'date' },
]
const noneExcluded = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set<string>() }

describe('ColumnPicker', () => {
  it('opens the popover and lists every column', () => {
    render(<ColumnPicker blockId="t" allColumns={cols} ex={noneExcluded} dispatch={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /עמודות/ }))
    expect(screen.getByLabelText('שם')).toBeInTheDocument()
    expect(screen.getByLabelText('תוקף')).toBeInTheDocument()
  })

  it('dispatches TOGGLE_COLUMN with the namespaced key', () => {
    const dispatch = vi.fn()
    render(<ColumnPicker blockId="t" allColumns={cols} ex={noneExcluded} dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: /עמודות/ }))
    fireEvent.click(screen.getByLabelText('תוקף'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_COLUMN', key: 't#c1' })
  })

  it('disables the last visible column so it cannot be hidden', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    render(<ColumnPicker blockId="t" allColumns={cols} ex={ex} dispatch={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /עמודות/ }))
    expect(screen.getByLabelText(/^שם/)).toBeDisabled()
    expect(screen.getByLabelText('תוקף')).not.toBeDisabled()
  })

  it('shows how many columns are hidden', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    render(<ColumnPicker blockId="t" allColumns={cols} ex={ex} dispatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: /עמודות/ }).textContent).toContain('1')
  })
})
