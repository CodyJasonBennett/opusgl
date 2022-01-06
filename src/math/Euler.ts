import { MathArray } from './MathArray'

export type EulerOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX'

export class Euler extends MathArray {
  readonly isEuler = true
  public x: number
  public y: number
  public z: number
  public order: EulerOrder = 'XYZ'

  constructor(x = 0, y = x, z = x) {
    super(3)
    this.set(x, y, z)
  }

  set(x: number, y: number = x, z: number = x) {
    this.x = x
    this.y = y
    this.z = z

    return this
  }

  copy(e: Euler) {
    this.x = e.x
    this.y = e.y
    this.z = e.z
    this.order = e.order

    return this
  }

  clone() {
    return new Euler().copy(this)
  }

  add(t: number | Euler) {
    if (typeof t === 'number') {
      this.x += t
      this.y += t
      this.z += t
    } else {
      this.x += t.x
      this.y += t.y
      this.z += t.z
    }

    return this
  }

  sub(t: number | Euler) {
    if (typeof t === 'number') {
      this.x -= t
      this.y -= t
      this.z -= t
    } else {
      this.x -= t.x
      this.y -= t.y
      this.z -= t.z
    }

    return this
  }

  multiply(t: number | Euler) {
    if (typeof t === 'number') {
      this.x *= t
      this.y *= t
      this.z *= t
    } else {
      this.x *= t.x
      this.y *= t.y
      this.z *= t.z
    }

    return this
  }

  divide(t: number | Euler) {
    if (typeof t === 'number') {
      this.x /= t
      this.y /= t
      this.z /= t
    } else {
      this.x /= t.x
      this.y /= t.y
      this.z /= t.z
    }

    return this
  }

  equals(e: Euler) {
    // prettier-ignore
    return (
      this.x === e.x &&
      this.y === e.y &&
      this.z === e.z &&
      this.order === e.order
    )
  }
}
