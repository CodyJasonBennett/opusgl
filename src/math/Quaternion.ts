import { MathArray } from './MathArray'

export class Quaternion extends MathArray {
  readonly isQuaternion = true
  public x: number
  public y: number
  public z: number
  public w: number

  constructor(x = 0, y = 0, z = 0, w = 1) {
    super(4)
    this.set(x, y, z, w)
  }

  set(x: number, y: number, z: number, w: number) {
    this.x = x
    this.y = y
    this.z = z
    this.w = w

    return this
  }

  copy(q: Quaternion) {
    this.x = q.x
    this.y = q.y
    this.z = q.z
    this.w = q.w

    return this
  }

  clone() {
    return new Quaternion().copy(this)
  }

  identity() {
    return this.set(0, 0, 0, 1)
  }

  add(t: number | Quaternion) {
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

  sub(t: number | Quaternion) {
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

  multiply(t: number | Quaternion) {
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

  divide(t: number | Quaternion) {
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

  equals(q: Quaternion) {
    // prettier-ignore
    return (
      this.x === q.x &&
      this.y === q.y &&
      this.z === q.z &&
      this.w === q.w
    )
  }

  conjugate() {
    return this.multiply(-1)
  }

  length() {
    return Math.hypot(this.x, this.y, this.z, this.w)
  }

  normalize() {
    return this.divide(this.length() || 1)
  }

  setLength(l: number) {
    return this.normalize().multiply(l)
  }

  dot(q: Quaternion) {
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w
  }
}
