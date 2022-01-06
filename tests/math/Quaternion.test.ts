import { Euler, Quaternion, Vector3 } from '../../src'

describe('math/Quaternion', () => {
  it('can accept args', () => {
    const quaternion = new Quaternion(1, 2, 3, 4)

    expect(quaternion.x).toBe(1)
    expect(quaternion.y).toBe(2)
    expect(quaternion.z).toBe(3)
    expect(quaternion.w).toBe(4)
  })

  it('can copy a quaternion', () => {
    const quaternion = new Quaternion()
    quaternion.copy(new Quaternion(1, 2, 3, 4))

    expect(quaternion.x).toBe(1)
    expect(quaternion.y).toBe(2)
    expect(quaternion.z).toBe(3)
    expect(quaternion.w).toBe(4)
  })

  it('can clone itself', () => {
    const quaternion1 = new Quaternion(1, 2, 3, 4)
    const quaternion2 = quaternion1.clone()

    expect(quaternion2).toBeInstanceOf(Quaternion)
    expect(quaternion2).not.toBe(quaternion1)
    expect(quaternion2.x).toBe(1)
    expect(quaternion2.y).toBe(2)
    expect(quaternion2.z).toBe(3)
    expect(quaternion2.w).toBe(4)
  })

  it('can add a scalar', () => {
    const quaternion = new Quaternion()
    quaternion.add(1)

    expect(quaternion.x).toBe(1)
    expect(quaternion.y).toBe(1)
    expect(quaternion.z).toBe(1)
  })

  it('can add a quaternion', () => {
    const quaternion = new Quaternion()
    quaternion.add(new Quaternion(1, 1, 1))

    expect(quaternion.x).toBe(1)
    expect(quaternion.y).toBe(1)
    expect(quaternion.z).toBe(1)
  })

  it('can subtract a scalar', () => {
    const quaternion = new Quaternion(1, 1, 1)
    quaternion.sub(1)

    expect(quaternion.x).toBe(0)
    expect(quaternion.y).toBe(0)
    expect(quaternion.z).toBe(0)
  })

  it('can subtract a quaternion', () => {
    const quaternion = new Quaternion(1, 1, 1)
    quaternion.sub(new Quaternion(1, 1, 1))

    expect(quaternion.x).toBe(0)
    expect(quaternion.y).toBe(0)
    expect(quaternion.z).toBe(0)
  })

  it('can multiply a scalar', () => {
    const quaternion = new Quaternion(2, 2, 2)
    quaternion.multiply(2)

    expect(quaternion.x).toBe(4)
    expect(quaternion.y).toBe(4)
    expect(quaternion.z).toBe(4)
  })

  it('can multiply a quaternion', () => {
    const quaternion = new Quaternion(2, 2, 2)
    quaternion.multiply(new Quaternion(2, 2, 2))

    expect(quaternion.x).toBe(4)
    expect(quaternion.y).toBe(4)
    expect(quaternion.z).toBe(4)
  })

  it('can divide a scalar', () => {
    const quaternion = new Quaternion(4, 4, 4)
    quaternion.divide(2)

    expect(quaternion.x).toBe(2)
    expect(quaternion.y).toBe(2)
    expect(quaternion.z).toBe(2)
  })

  it('can divide a quaternion', () => {
    const quaternion = new Quaternion(4, 4, 4)
    quaternion.divide(new Quaternion(2, 2, 2))

    expect(quaternion.x).toBe(2)
    expect(quaternion.y).toBe(2)
    expect(quaternion.z).toBe(2)
  })

  it('can check for equality', () => {
    const quaternion = new Quaternion(1, 2, 3, 4)

    expect(quaternion.equals(quaternion.clone())).toBe(true)
    expect(quaternion.equals(new Quaternion())).toBe(false)
  })

  it('can be set from a Euler', () => {
    const quaternion = new Quaternion().fromEuler(new Euler(0, Math.PI / 2, 0))

    expect(Array.from(quaternion)).toMatchSnapshot()
  })

  it('can calculate an axis angle', () => {
    const axis = new Quaternion().fromEuler(new Euler(0, Math.PI / 2, 0)).getAxisAngle(new Vector3())

    expect(Array.from(axis).map((n) => Math.round(n))).toStrictEqual([0, 1, 0])
  })
})
