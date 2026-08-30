import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrintBlock } from './PrintView'
import type { Block } from '../types'

const table = {
  kind: 'table', id: 's7-suppliers',
  columns: [
    { id: 'c0', label: 'ספק', type: 'text' },
    { id: 'c5', label: 'תוקף', type: 'date' },
  ],
} as Extract<Block, { kind: 'table' }>

const values = { 's7-suppliers': [{ _id: 'r', c0: 'ספק א', c5: '12/2026' }] }
const none = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set<string>() }
const hideValidity = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['s7-suppliers#c5']) }

describe('PrintBlock', () => {
  it('prints every column when the site excludes nothing', () => {
    render(<PrintBlock block={table} values={values} ex={none} />)
    expect(screen.getByText('תוקף')).toBeInTheDocument()
    expect(screen.getByText('12/2026')).toBeInTheDocument()
  })

  it('omits an excluded column from the header and the body', () => {
    render(<PrintBlock block={table} values={values} ex={hideValidity} />)
    expect(screen.getByText('ספק א')).toBeInTheDocument()
    expect(screen.queryByText('תוקף')).toBeNull()
    expect(screen.queryByText('12/2026')).toBeNull()
  })

  it('treats a row as empty when its only non-empty value sits in an excluded column', () => {
    const onlyHiddenColFilled = { 's7-suppliers': [{ _id: 'r', c5: '12/2026' }] }
    render(<PrintBlock block={table} values={onlyHiddenColFilled} ex={hideValidity} />)
    expect(screen.queryByText('12/2026')).toBeNull()
    expect(screen.getByText('— לא הוזן —')).toBeInTheDocument()
  })
})
