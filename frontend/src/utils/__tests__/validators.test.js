import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
} from '../validators'

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false)
  })
})

describe('validatePassword', () => {
  it('requires at least 6 characters', () => {
    expect(validatePassword('123456')).toBe(true)
    expect(validatePassword('12345')).toBe(false)
  })
})

describe('validatePhone', () => {
  it('accepts 10+ digit numbers', () => {
    expect(validatePhone('+91 90000 00001')).toBe(true)
  })

  it('rejects short numbers', () => {
    expect(validatePhone('12345')).toBe(false)
  })
})

describe('validateRequired', () => {
  it('rejects empty values', () => {
    expect(validateRequired('')).toBeFalsy()
    expect(validateRequired('  ')).toBeFalsy()
  })

  it('accepts non-empty values', () => {
    expect(validateRequired('hello')).toBe(true)
  })
})