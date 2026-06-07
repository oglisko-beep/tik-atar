import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Regression guard for the print-clip bug: read the actual stylesheet text.
// vitest runs with cwd = the app/ directory.
const printCss = readFileSync(join(process.cwd(), 'src/styles/print.css'), 'utf8')
const printBlock = printCss.slice(printCss.indexOf('@media print'))

describe('print.css', () => {
  it('resets document height/overflow for print so multi-page output is not clipped to one page', () => {
    expect(printBlock).toMatch(/#root[^}]*height:\s*auto/)
    expect(printBlock).toMatch(/overflow:\s*visible/)
  })

  it('hides the interactive shell and shows the print document in print', () => {
    expect(printBlock).toMatch(/\.app-shell[^{]*\{[^}]*display:\s*none/)
    expect(printBlock).toMatch(/\.print-view\s*\{[^}]*display:\s*block/)
  })

  it('uses fixed table layout and wraps long values so a cell cannot widen the page', () => {
    expect(printBlock).toMatch(/table-layout:\s*fixed/)
    expect(printBlock).toMatch(/overflow-wrap:\s*anywhere|word-break:\s*break-word/)
  })
})
