import { describe, it, expect } from 'vitest'
import { uuid, uniformsEqual, Vector2 } from '../src'

describe('utils/uuid', () => {
  it('is UUID RFC compliant', () => {
    const uuids = Array.from({ length: 1000 }, () => uuid())

    // Has a length of 36
    expect(uuids.every((uuid) => uuid.length === 36)).toBe(true)
    // 32 digits
    expect(uuids.every((uuid) => uuid.match(/\d|\w/g)!.length === 32)).toBe(true)
    // All upper case letters
    expect(uuids.every((uuid) => !/[a-z]/.test(uuid))).toBe(true)
  })
})

describe('utils/uniformsEqual', () => {
  it('can compare uniforms', () => {
    // Compares array uniforms
    expect(uniformsEqual([0], [0])).toBe(true)
    expect(uniformsEqual([0], [1])).toBe(false)
    expect(uniformsEqual(new Vector2(1), new Vector2(1))).toBe(true)
    expect(uniformsEqual(new Vector2(1), new Vector2(2))).toBe(false)

    // Atomically compares numbers
    expect(uniformsEqual(1, 1)).toBe(true)
    expect(uniformsEqual(1, 2)).toBe(false)
  })
})
