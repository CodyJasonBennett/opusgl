import { describe, it, expect } from 'vitest'
import { uuid, std140, uniformsEqual, Vector2 } from '../src'

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
    // Test number and number[] with lengths 1-4
    for (let size = 0; size < 4; size++) {
      // Arbitrary amount of times, 16 for min packing size
      for (let length = 0; length < 16; length++) {
        const uniforms = Array.from({ length }, () => (size < 1 ? size : Array(size).fill(0)))
        const buffer = std140(uniforms)

        expect(buffer.byteLength % 16).toBe(0)
      }
    }
  })
})

describe('utils/uniformsEqual', () => {
  it('can compare uniforms', () => {
    // Compares math classes via #equals
    expect(uniformsEqual(new Vector2(1), new Vector2(1))).toBe(true)
    expect(uniformsEqual(new Vector2(1), new Vector2(2))).toBe(false)

    // Atomically compares numbers
    expect(uniformsEqual(1, 1)).toBe(true)
    expect(uniformsEqual(1, 2)).toBe(false)
  })
})
