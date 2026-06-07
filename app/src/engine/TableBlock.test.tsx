import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TableBlock } from './TableBlock'
import type { Block, Row } from '../types'

const block = {
  kind: 'table',
  id: 't',
  columns: [
    { id: 'c0', label: 'שם', type: 'text' },
    { id: 'c1', label: 'IP', type: 'ip' },
  ],
} as Extract<Block, { kind: 'table' }>

describe('TableBlock', () => {
  it('adds a row when "הוסף שורה" is clicked', () => {
    const onChange = vi.fn()
    render(<TableBlock block={block} value={[]} onChange={onChange} showExamples={false} />)
    fireEvent.click(screen.getByRole('button', { name: /הוסף שורה/ }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const rows = onChange.mock.calls[0][0] as Row[]
    expect(rows.length).toBe(1)
    expect(rows[0]._id).toBeTruthy()
  })

  it('edits a cell and emits the full rows array', () => {
    const onChange = vi.fn()
    const value: Row[] = [{ _id: 'a', c0: '', c1: '' }]
    render(<TableBlock block={block} value={value} onChange={onChange} showExamples={false} />)
    fireEvent.change(screen.getByLabelText('שם'), { target: { value: 'GY-DC01' } })
    expect(onChange).toHaveBeenCalled()
    const rows = onChange.mock.calls[0][0] as Row[]
    expect(rows[0].c0).toBe('GY-DC01')
  })

  it('shows example rows only when showExamples is on', () => {
    const exBlock = { ...block, examples: [{ c0: 'דוגמה-שם', c1: '1.2.3.4' }] } as Extract<Block, { kind: 'table' }>
    const { rerender } = render(<TableBlock block={exBlock} value={[]} onChange={vi.fn()} showExamples={false} />)
    expect(screen.queryByText('דוגמה-שם')).toBeNull()
    rerender(<TableBlock block={exBlock} value={[]} onChange={vi.fn()} showExamples />)
    expect(screen.getByText('דוגמה-שם')).toBeInTheDocument()
  })
})
