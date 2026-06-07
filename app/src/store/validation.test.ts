import { describe, it, expect } from 'vitest'
import { validate } from './validation'

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
  it('validates date in dd/mm/yyyy and yyyy-mm-dd', () => {
    expect(validate('date', '29/05/2026').valid).toBe(true)
    expect(validate('date', '2026-05-29').valid).toBe(true)
    expect(validate('date', '31/31/2026').valid).toBe(false)
    expect(validate('date', '2026-13-01').valid).toBe(false)
    expect(validate('date', 'hello').valid).toBe(false)
  })
  it('text is always valid', () => {
    expect(validate('text', 'anything').valid).toBe(true)
  })
})
