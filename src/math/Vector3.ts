import { MathArray } from './MathArray'

export class Vector3 extends MathArray {
  readonly isVector3 = true
  public x: number
  public y: number
  public z: number

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

  copy(v: Vector3) {
    this.x = v.x
    this.y = v.y
    this.z = v.z

    return this
  }

  clone() {
    return new Vector3().copy(this)
  }

  add(t: number | Vector3) {
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

  sub(t: number | Vector3) {
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

  multiply(t: number | Vector3) {
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

  divide(t: number | Vector3) {
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

  equals(v: Vector3) {
    // prettier-ignore
    return (
      this.x === v.x &&
      this.y === v.y &&
      this.z === v.z
    )
  }

  negate() {
    return this.multiply(-1)
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  length() {
    return Math.hypot(this.x, this.y, this.z)
  }

  normalize() {
    return this.divide(this.length() || 1)
  }

  setLength(l: number) {
    return this.normalize().multiply(l)
  }

  distanceTo(v: Vector3) {
    return v.length() - this.length()
  }

  inverse() {
    this.x = 1 / this.x
    this.y = 1 / this.y
    this.z = 1 / this.z

    return this
  }

  dot(v: Vector3) {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  cross(v: Vector3) {
    return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x)
  }

  lerp(v: Vector3, t: number) {
    return this.set(v.x - this.x, v.y - this.y, v.z - this.z).multiply(t)
  }
}
