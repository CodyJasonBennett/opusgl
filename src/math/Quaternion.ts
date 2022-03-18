import type { Euler } from './Euler'
import type { Vector3 } from './Vector3'

export class Quaternion extends Float32Array {
  readonly isQuaternion = true

  constructor(x = 0, y = 0, z = 0, w = 1) {
    super(4)
    this.set(x, y, z, w)
  }

  get x() {
    return this[0]
  }

  set x(x) {
    this[0] = x
  }

  get y() {
    return this[1]
  }

  set y(y) {
    this[1] = y
  }

  get z() {
    return this[2]
  }

  set z(z) {
    this[2] = z
  }

  get w() {
    return this[3]
  }

  set w(w) {
    this[3] = w
  }

  // @ts-expect-error
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
