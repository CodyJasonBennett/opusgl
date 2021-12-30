import { Euler } from '../../src'

describe('math/Euler', () => {
  it('can accept args', () => {
    const euler = new Euler(1, 2, 3)

    expect(euler.x).toBe(1)
    expect(euler.y).toBe(2)
    expect(euler.z).toBe(3)
  })

  it('can copy a euler', () => {
    const euler = new Euler()
    euler.copy(new Euler(1, 2))

    expect(euler.x).toBe(1)
    expect(euler.y).toBe(2)
  })

  it('can clone itself', () => {
    const euler1 = new Euler(1, 2, 3)
    euler1.order = 'XYZ'
    const euler2 = euler1.clone()

    expect(euler2).toBeInstanceOf(Euler)
    expect(euler2).not.toBe(euler1)
    expect(euler2.x).toBe(1)
    expect(euler2.y).toBe(2)
    expect(euler2.z).toBe(3)
    expect(euler2.order).toBe('XYZ')
  })

  it('can add a scalar', () => {
    const euler = new Euler()
    euler.add(1)

    expect(euler.x).toBe(1)
    expect(euler.y).toBe(1)
    expect(euler.z).toBe(1)
  })

  it('can add a euler', () => {
    const euler = new Euler()
    euler.add(new Euler(1))

    expect(euler.x).toBe(1)
    expect(euler.y).toBe(1)
    expect(euler.z).toBe(1)
  })

  it('can subtract a scalar', () => {
    const euler = new Euler(1)
    euler.sub(1)

    expect(euler.x).toBe(0)
    expect(euler.y).toBe(0)
    expect(euler.z).toBe(0)
  })

  it('can subtract a euler', () => {
    const euler = new Euler(1)
    euler.sub(new Euler(1))

    expect(euler.x).toBe(0)
    expect(euler.y).toBe(0)
    expect(euler.z).toBe(0)
  })

  it('can multiply a scalar', () => {
    const euler = new Euler(2)
    euler.multiply(2)

    expect(euler.x).toBe(4)
    expect(euler.y).toBe(4)
    expect(euler.z).toBe(4)
  })

  it('can multiply a euler', () => {
    const euler = new Euler(2)
    euler.multiply(new Euler(2))

    expect(euler.x).toBe(4)
    expect(euler.y).toBe(4)
    expect(euler.z).toBe(4)
  })

  it('can divide a scalar', () => {
    const euler = new Euler(4)
    euler.divide(2)

    expect(euler.x).toBe(2)
    expect(euler.y).toBe(2)
    expect(euler.z).toBe(2)
  })

  it('can divide a euler', () => {
    const euler = new Euler(4)
    euler.divide(new Euler(2))

    expect(euler.x).toBe(2)
    expect(euler.y).toBe(2)
    expect(euler.z).toBe(2)
  })

  it('can check for equality', () => {
    const euler = new Euler(1, 2, 3)

    expect(euler.equals(euler.clone())).toBe(true)
    expect(euler.equals(new Euler())).toBe(false)
  })
})
