import { Matrix4 } from './Matrix4'
import type { Quaternion } from './Quaternion'
import { clamp } from '../utils'

export type EulerOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX'

export class Euler extends Float32Array {
  readonly isEuler = true
  public order: EulerOrder = 'YXZ'
  public onChange?: () => any
  private _m = new Matrix4()

  constructor(x = 0, y = x, z = x) {
    super(3)
    this.set(x, y, z)
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

  // @ts-expect-error
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
      this.z === e.z
    )
  }

  fromMatrix4(m: Matrix4) {
    const m11 = m[0]
    const m12 = m[4]
    const m13 = m[8]
    const m21 = m[1]
    const m22 = m[5]
    const m23 = m[9]
    const m31 = m[2]
    const m32 = m[6]
    const m33 = m[10]

    switch (this.order) {
      case 'XYZ':
        this[1] = Math.asin(clamp(m13, [-1, 1]))

        if (Math.abs(m13) < 1 - Number.EPSILON) {
          this[0] = Math.atan2(-m23, m33)
          this[2] = Math.atan2(-m12, m11)
        } else {
          this[0] = Math.atan2(m32, m22)
          this[2] = 0
        }

        break

      case 'YXZ':
        this[0] = Math.asin(-clamp(m23, [-1, 1]))

        if (Math.abs(m23) < 1 - Number.EPSILON) {
          this[1] = Math.atan2(m13, m33)
          this[2] = Math.atan2(m21, m22)
        } else {
          this[1] = Math.atan2(-m31, m11)
          this[2] = 0
        }

        break

      case 'ZXY':
        this[0] = Math.asin(clamp(m32, [-1, 1]))

        if (Math.abs(m32) < 1 - Number.EPSILON) {
          this[1] = Math.atan2(-m31, m33)
          this[2] = Math.atan2(-m12, m22)
        } else {
          this[1] = 0
          this[2] = Math.atan2(m21, m11)
        }

        break

      case 'ZYX':
        this[1] = Math.asin(-clamp(m31, [-1, 1]))

        if (Math.abs(m31) < 1 - Number.EPSILON) {
          this[0] = Math.atan2(m32, m33)
          this[2] = Math.atan2(m21, m11)
        } else {
          this[0] = 0
          this[2] = Math.atan2(-m12, m22)
        }

        break

      case 'YZX':
        this[2] = Math.asin(clamp(m21, [-1, 1]))

        if (Math.abs(m21) < 1 - Number.EPSILON) {
          this[0] = Math.atan2(-m23, m22)
          this[1] = Math.atan2(-m31, m11)
        } else {
          this[0] = 0
          this[1] = Math.atan2(m13, m33)
        }

        break

      case 'XZY':
        this[2] = Math.asin(-clamp(m12, [-1, 1]))

        if (Math.abs(m12) < 1 - Number.EPSILON) {
          this[0] = Math.atan2(m32, m22)
          this[1] = Math.atan2(m13, m11)
        } else {
          this[0] = Math.atan2(-m23, m33)
          this[1] = 0
        }

        break
    }

    return this
  }

  fromQuaternion(q: Quaternion) {
    return this.fromMatrix4(this._m.fromQuaternion(q))
  }
}
