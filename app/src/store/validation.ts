import type { FieldType } from '../types'

const IP = /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)(\/\d{1,2})?$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Parse a date string to a timestamp. Accepts dd/mm/yyyy, yyyy-mm-dd, and mm/yyyy
 * (month precision → last day of that month). Returns null if unparseable/invalid.
 */
export function parseDate(v: string): number | null {
  const s = v.trim()
  if (!s) return null
  const my = s.match(/^(\d{1,2})\/(\d{4})$/) // mm/yyyy
  if (my) {
    const m = +my[1]
    return m >= 1 && m <= 12 ? new Date(+my[2], m, 0).getTime() : null // day 0 of next month = last day
  }
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) // dd/mm/yyyy
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/) // yyyy-mm-dd
  let d = 0, m = 0, y = 0
  if (dmy) { d = +dmy[1]; m = +dmy[2]; y = +dmy[3] }
  else if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3] }
  else return null
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? new Date(y, m - 1, d).getTime() : null
}

export interface ValidationResult {
  valid: boolean
  message?: string
}

/** Lightweight, non-blocking validation. Empty values are always valid. */
export function validate(type: FieldType, v: string): ValidationResult {
  if (!v || !v.trim()) return { valid: true }
  if (type === 'ip') {
    return IP.test(v.trim()) ? { valid: true } : { valid: false, message: 'כתובת IP לא תקינה' }
  }
  if (type === 'email') {
    return EMAIL.test(v.trim()) ? { valid: true } : { valid: false, message: 'כתובת דוא״ל לא תקינה' }
  }
  if (type === 'date') {
    return parseDate(v) !== null ? { valid: true } : { valid: false, message: 'תאריך לא תקין (dd/mm/yyyy או mm/yyyy)' }
  }
  return { valid: true }
}

/** Required-field check (non-blocking, visual only). True when required but blank. */
export function requiredEmpty(required: boolean | undefined, v: string): boolean {
  return !!required && !v.trim()
}
