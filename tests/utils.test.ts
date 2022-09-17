import { describe, it, expect } from 'vitest'
import { uniformsEqual, Vector2 } from '../src'

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
