import type { FieldType } from '../types'

const IP = /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)(\/\d{1,2})?$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/

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
    const t = v.trim()
    if (!DATE.test(t)) return { valid: false, message: 'תאריך לא תקין (dd/mm/yyyy)' }
    const [d, m] = t.includes('/')
      ? (t.split('/').map(Number) as [number, number, number])
      : [Number(t.slice(8, 10)), Number(t.slice(5, 7))]
    return d >= 1 && d <= 31 && m >= 1 && m <= 12 ? { valid: true } : { valid: false, message: 'תאריך לא תקין' }
  }
  return { valid: true }
}
