import { Euler } from '../../src'

describe('math/Euler', () => {
  it('can accept args', () => {
    const euler = new Euler(1, 2, 3, 'XYZ')

    expect(euler.x).toBe(1)
    expect(euler.y).toBe(2)
    expect(euler.z).toBe(3)
    expect(euler.order).toBe('XYZ')
  })

  it('can spread into an array', () => {
    const arr = [...new Euler()]

    expect(arr).toMatchSnapshot()
  })

  it('can copy a euler', () => {
    const euler = new Euler()
    euler.copy(new Euler(1, 2))

    expect(euler.x).toBe(1)
    expect(euler.y).toBe(2)
  })

  it('can clone itself', () => {
    const euler1 = new Euler(1, 2, 3, 'XYZ')
    const euler2 = euler1.clone()

    expect(euler2).toBeInstanceOf(Euler)
    expect(euler2).not.toBe(euler1)
    expect(euler2.x).toBe(1)
    expect(euler2.y).toBe(2)
    expect(euler2.z).toBe(3)
    expect(euler2.order).toBe('XYZ')
  })
})
