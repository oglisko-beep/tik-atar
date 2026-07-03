import { describe, it, expect } from 'vitest'
import { validate, requiredEmpty, parseDate } from './validation'

describe('validate', () => {
  it('accepts valid and empty IPs, rejects bad ones', () => {
    expect(validate('ip', '192.168.1.1').valid).toBe(true)
    expect(validate('ip', '10.0.0.0/24').valid).toBe(true)
    expect(validate('ip', '').valid).toBe(true)
    expect(validate('ip', '999.1.1.1').valid).toBe(false)
    expect(validate('ip', 'abc').valid).toBe(false)
  })
  it('validates email', () => {
    expect(validate('email', 'a@b.co').valid).toBe(true)
    expect(validate('email', 'nope').valid).toBe(false)
  })
  it('validates date in dd/mm/yyyy, yyyy-mm-dd and mm/yyyy', () => {
    expect(validate('date', '29/05/2026').valid).toBe(true)
    expect(validate('date', '2026-05-29').valid).toBe(true)
    expect(validate('date', '12/2026').valid).toBe(true)
    expect(validate('date', '31/31/2026').valid).toBe(false)
    expect(validate('date', '2026-13-01').valid).toBe(false)
    expect(validate('date', '13/2026').valid).toBe(false)
    expect(validate('date', 'hello').valid).toBe(false)
  })
  it('text is always valid', () => {
    expect(validate('text', 'anything').valid).toBe(true)
  })
})

describe('parseDate', () => {
  it('parses dd/mm/yyyy, yyyy-mm-dd and mm/yyyy (month → end of month)', () => {
    expect(parseDate('15/03/2026')).toBe(new Date(2026, 2, 15).getTime())
    expect(parseDate('2026-03-15')).toBe(new Date(2026, 2, 15).getTime())
    // mm/yyyy resolves to the last day of the month
    expect(parseDate('12/2026')).toBe(new Date(2026, 11, 31).getTime())
    expect(parseDate('02/2025')).toBe(new Date(2025, 1, 28).getTime())
  })
  it('returns null for empty or unparseable input', () => {
    expect(parseDate('')).toBeNull()
    expect(parseDate('  ')).toBeNull()
    expect(parseDate('hello')).toBeNull()
    expect(parseDate('13/2026')).toBeNull()
    expect(parseDate('31/31/2026')).toBeNull()
  })
})

describe('requiredEmpty', () => {
  it('is true only when required and blank', () => {
    expect(requiredEmpty(true, '')).toBe(true)
    expect(requiredEmpty(true, '   ')).toBe(true)
    expect(requiredEmpty(true, 'x')).toBe(false)
    expect(requiredEmpty(false, '')).toBe(false)
    expect(requiredEmpty(undefined, '')).toBe(false)
  })
})
