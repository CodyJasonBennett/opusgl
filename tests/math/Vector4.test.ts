import { Vector4 } from '../../src'

describe('math/Vector4', () => {
  it('can accept args', () => {
    const vector = new Vector4(1, 2, 3, 4)

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(2)
    expect(vector.z).toBe(3)
    expect(vector.w).toBe(4)
  })

  it('can copy a vector', () => {
    const vector = new Vector4()
    vector.copy(new Vector4(1, 2, 3, 4))

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(2)
    expect(vector.z).toBe(3)
    expect(vector.w).toBe(4)
  })

  it('can clone itself', () => {
    const vector1 = new Vector4(1, 1, 1)
    const vector2 = vector1.clone()

    expect(vector2).toBeInstanceOf(Vector4)
    expect(vector2).not.toBe(vector1)
    expect(vector2.x).toBe(1)
    expect(vector2.y).toBe(1)
    expect(vector2.z).toBe(1)
  })

  it('can add a scalar', () => {
    const vector = new Vector4()
    vector.add(1)

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(1)
    expect(vector.z).toBe(1)
    expect(vector.w).toBe(2)
  })

  it('can add a vector', () => {
    const vector = new Vector4(0, 0, 0, 0)
    vector.add(new Vector4(1, 1, 1))

    expect(vector.x).toBe(1)
    expect(vector.y).toBe(1)
    expect(vector.z).toBe(1)
    expect(vector.w).toBe(1)
  })

  it('can subtract a scalar', () => {
    const vector = new Vector4(1, 1, 1)
    vector.sub(1)

    expect(vector.x).toBe(0)
    expect(vector.y).toBe(0)
    expect(vector.z).toBe(0)
    expect(vector.w).toBe(0)
  })

  it('can subtract a vector', () => {
    const vector = new Vector4(1, 1, 1)
    vector.sub(new Vector4(1, 1, 1))

    expect(vector.x).toBe(0)
    expect(vector.y).toBe(0)
    expect(vector.z).toBe(0)
    expect(vector.w).toBe(0)
  })

  it('can multiply a scalar', () => {
    const vector = new Vector4(2, 2, 2, 2)
    vector.multiply(2)

    expect(vector.x).toBe(4)
    expect(vector.y).toBe(4)
    expect(vector.z).toBe(4)
    expect(vector.w).toBe(4)
  })

  it('can multiply a vector', () => {
    const vector = new Vector4(2, 2, 2, 2)
    vector.multiply(new Vector4(2, 2, 2, 2))

    expect(vector.x).toBe(4)
    expect(vector.y).toBe(4)
    expect(vector.z).toBe(4)
    expect(vector.w).toBe(4)
  })

  it('can divide a scalar', () => {
    const vector = new Vector4(4, 4, 4, 4)
    vector.divide(2)

    expect(vector.x).toBe(2)
    expect(vector.y).toBe(2)
    expect(vector.z).toBe(2)
    expect(vector.w).toBe(2)
  })

  it('can divide a vector', () => {
    const vector = new Vector4(4, 4, 4, 4)
    vector.divide(new Vector4(2, 2, 2, 2))

    expect(vector.x).toBe(2)
    expect(vector.y).toBe(2)
    expect(vector.z).toBe(2)
    expect(vector.w).toBe(2)
  })

  it('can check for equality', () => {
    const vector = new Vector4(1)

    expect(vector.equals(vector.clone())).toBe(true)
    expect(vector.equals(new Vector4())).toBe(false)
  })
})
