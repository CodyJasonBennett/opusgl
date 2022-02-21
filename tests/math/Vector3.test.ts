import { describe, it, expect } from 'vitest'
import { Vector3 } from '../../src'

describe('math/Vector3', () => {
  it('can accept a scalar', () => {
    const vector = new Vector3(1)

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(1)
    expect(vector.z).toBe(1)
  })

  it('can accept args', () => {
    const vector = new Vector3(1, 2, 3)

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(2)
    expect(vector.z).toBe(3)
  })

  it('can copy a vector', () => {
    const vector = new Vector3()
    vector.copy(new Vector3(1, 2, 3))

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(2)
    expect(vector.z).toBe(3)
  })

  it('can clone itself', () => {
    const vector1 = new Vector3(1)
    const vector2 = vector1.clone()

    expect(vector2).toBeInstanceOf(Vector3)
    expect(vector2).not.toBe(vector1)
    expect(vector2.x).toBe(1)
    expect(vector2.y).toBe(1)
    expect(vector2.z).toBe(1)
  })

  it('can add a scalar', () => {
    const vector = new Vector3()
    vector.add(1)

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(1)
    expect(vector.z).toBe(1)
  })

  it('can add a vector', () => {
    const vector = new Vector3()
    vector.add(new Vector3(1))

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(1)
    expect(vector.z).toBe(1)
  })

  it('can subtract a scalar', () => {
    const vector = new Vector3(1)
    vector.sub(1)

    expect(vector.x).toBe(0)
    expect(vector.y).toBe(0)
    expect(vector.z).toBe(0)
  })

  it('can subtract a vector', () => {
    const vector = new Vector3(1)
    vector.sub(new Vector3(1))

    expect(vector.x).toBe(0)
    expect(vector.y).toBe(0)
    expect(vector.z).toBe(0)
  })

  it('can multiply a scalar', () => {
    const vector = new Vector3(2)
    vector.multiply(2)

    expect(vector.x).toBe(4)
    expect(vector.y).toBe(4)
    expect(vector.z).toBe(4)
  })

  it('can multiply a vector', () => {
    const vector = new Vector3(2)
    vector.multiply(new Vector3(2))

    expect(vector.x).toBe(4)
    expect(vector.y).toBe(4)
    expect(vector.z).toBe(4)
  })

  it('can divide a scalar', () => {
    const vector = new Vector3(4)
    vector.divide(2)

    expect(vector.x).toBe(2)
    expect(vector.y).toBe(2)
    expect(vector.z).toBe(2)
  })

  it('can divide a vector', () => {
    const vector = new Vector3(4)
    vector.divide(new Vector3(2))

    expect(vector.x).toBe(2)
    expect(vector.y).toBe(2)
    expect(vector.z).toBe(2)
  })

  it('can check for equality', () => {
    const vector = new Vector3(1)

    expect(vector.equals(vector.clone())).toBe(true)
    expect(vector.equals(new Vector3())).toBe(false)
  })
})
