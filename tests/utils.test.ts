import { describe, it, expect } from 'vitest'
import { uuid, std140, Uniform } from '../src'

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

describe('utils/std140', () => {
  it('packs into 16 byte chunks', () => {
    const uniforms = Array.from({ length: 1000 }, (_, i) => (i < 2 ? i : Array(i).fill(0))) as unknown as Uniform[]
    const buffer = std140(uniforms)

    expect(buffer.byteLength % 16).toBe(0)
  })
})
