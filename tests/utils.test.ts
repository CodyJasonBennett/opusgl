import { describe, it, expect } from 'vitest'
import { uuid } from '../src'

describe('utils/uuid', () => {
  it('is UUID RFC compliant', () => {
    const uuids = Array.from({ length: 1000 }, () => uuid())

    // Has a length of 36
    expect(uuids.every((uuid) => uuid.length === 36)).toBe(true)
    // 32 digits
    expect(uuids.every((uuid) => uuid.match(/\d|\w/g).length === 32)).toBe(true)
    // All upper case letters
    expect(uuids.every((uuid) => !/[a-z]/.test(uuid))).toBe(true)
  })
})
