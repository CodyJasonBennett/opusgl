import type { Euler } from './Euler'
import type { Vector3 } from './Vector3'

export class Quaternion extends Array {
  public onChange?: () => any

  constructor(x = 0, y = 0, z = 0, w = 1) {
    super(4)
    this.set(x, y, z, w)
  }

  get x() {
    return this[0]
  }

  set x(x) {
    this[0] = x
    this.onChange?.()
  }

  get y() {
    return this[1]
  }

  set y(y) {
    this[1] = y
    this.onChange?.()
  }

  get z() {
    return this[2]
  }

  set z(z) {
    this[2] = z
    this.onChange?.()
  }

  get w() {
    return this[3]
  }

  set w(w) {
    this[3] = w
    this.onChange?.()
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

  getLength() {
    return Math.hypot(this.x, this.y, this.z, this.w)
  }

  setLength(l: number) {
    return this.normalize().multiply(l)
  }

  normalize() {
    return this.divide(this.getLength() || 1)
  }

  dot(q: Quaternion) {
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w
  }

  slerp(q: Quaternion, t: number) {
    let cosom = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w
    if (cosom < 0) cosom *= -1

    let scale0 = 1 - t
    let scale1 = t

    if (1 - cosom > Number.EPSILON) {
      const omega = Math.acos(cosom)
      const sinom = Math.sin(omega)
      scale0 = Math.sin((1 - t) * omega) / sinom
      scale1 = Math.sin(t * omega) / sinom
    }

    if (cosom < 0) scale1 *= -1

    this.set(
      scale0 * this.x + scale1 * q.x,
      scale0 * this.y + scale1 * q.y,
      scale0 * this.z + scale1 * q.z,
      scale0 * this.w + scale1 * q.w,
    )

    return this
  }

  getAxisAngle(axis: Vector3) {
    const rad = Math.acos(this.w) * 2
    const s = Math.sin(rad / 2)

    if (s > Number.EPSILON) {
      return axis.set(this.x / s, this.y / s, this.z / s)
    } else {
      return axis.set(1, 0, 0)
    }
  }

  fromEuler(e: Euler) {
    const c1 = Math.cos(e.x / 2)
    const c2 = Math.cos(e.y / 2)
    const c3 = Math.cos(e.z / 2)

    const s1 = Math.sin(e.x / 2)
    const s2 = Math.sin(e.y / 2)
    const s3 = Math.sin(e.z / 2)

    switch (e.order) {
      case 'XYZ':
        this.x = s1 * c2 * c3 + c1 * s2 * s3
        this.y = c1 * s2 * c3 - s1 * c2 * s3
        this.z = c1 * c2 * s3 + s1 * s2 * c3
        this.w = c1 * c2 * c3 - s1 * s2 * s3
        break

      case 'YXZ':
        this.x = s1 * c2 * c3 + c1 * s2 * s3
        this.y = c1 * s2 * c3 - s1 * c2 * s3
        this.z = c1 * c2 * s3 - s1 * s2 * c3
        this.w = c1 * c2 * c3 + s1 * s2 * s3
        break

      case 'ZXY':
        this.x = s1 * c2 * c3 - c1 * s2 * s3
        this.y = c1 * s2 * c3 + s1 * c2 * s3
        this.z = c1 * c2 * s3 + s1 * s2 * c3
        this.w = c1 * c2 * c3 - s1 * s2 * s3
        break

      case 'ZYX':
        this.x = s1 * c2 * c3 - c1 * s2 * s3
        this.y = c1 * s2 * c3 + s1 * c2 * s3
        this.z = c1 * c2 * s3 - s1 * s2 * c3
        this.w = c1 * c2 * c3 + s1 * s2 * s3
        break

      case 'YZX':
        this.x = s1 * c2 * c3 + c1 * s2 * s3
        this.y = c1 * s2 * c3 + s1 * c2 * s3
        this.z = c1 * c2 * s3 - s1 * s2 * c3
        this.w = c1 * c2 * c3 - s1 * s2 * s3
        break

      case 'XZY':
        this.x = s1 * c2 * c3 - c1 * s2 * s3
        this.y = c1 * s2 * c3 - s1 * c2 * s3
        this.z = c1 * c2 * s3 + s1 * s2 * c3
        this.w = c1 * c2 * c3 + s1 * s2 * s3
        break
    }

    return this
  }
}
