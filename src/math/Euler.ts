import { Matrix4 } from './Matrix4'
import type { Quaternion } from './Quaternion'

/**
 * Represents an axis order or the order of rotations around local space.
 */
export type EulerOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX'

/**
 * Calculates a Euler angle with a defined axis order.
 */
export class Euler extends Array {
  public order: EulerOrder = 'ZYX'
  private _m = new Matrix4()

  constructor(x = 0, y = x, z = x, order?: EulerOrder) {
    super(3)
    this.set(x, y, z, order)
  }

  get x(): number {
    return this[0]
  }

  set x(x) {
    this[0] = x
  }

  get y(): number {
    return this[1]
  }

  set y(y) {
    this[1] = y
  }

  get z(): number {
    return this[2]
  }

  set z(z) {
    this[2] = z
  }

  /**
   * Sets this euler's x, y, z, and order properties.
   */
  set(x: number, y: number = x, z: number = x, order: EulerOrder = this.order): this {
    this.x = x
    this.y = y
    this.z = z
    this.order = order

    return this
  }

  /**
   * Copies properties from another `Euler`.
   */
  copy(e: Euler): this {
    this.x = e.x
    this.y = e.y
    this.z = e.z
    this.order = e.order

    return this
  }

  /**
   * Constructs a new `Euler` with identical properties.
   */
  clone(): Euler {
    return new Euler().copy(this)
  }

  /**
   * Adds a scalar or `Euler`.
   */
  add(t: number | Euler): this {
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

  /**
   * Subtracts a scalar or `Euler`.
   */
  sub(t: number | Euler): this {
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

  /**
   * Multiplies a scalar or `Euler`.
   */
  multiply(t: number | Euler): this {
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

  /**
   * Divides a scalar of `Euler`.
   */
  divide(t: number | Euler): this {
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

  /**
   * Checks for strict equality with another `Euler`.
   */
  equals(e: Euler): boolean {
    // prettier-ignore
    return (
      this.x === e.x &&
      this.y === e.y &&
      this.z === e.z &&
      this.order === e.order
    )
  }

  /**
   * Negates or calculates the inverse of this euler.
   */
  invert(): this {
    return this.multiply(-1)
  }

  /**
   * Calculates the Euclidean length of this euler.
   */
  getLength(): number {
    return Math.hypot(this.x, this.y, this.z)
  }

  /**
   * Sets this euler to a length of `l` with the same direction.
   */
  setLength(l: number): this {
    return this.normalize().multiply(l)
  }

  /**
   * Normalizes this euler.
   */
  normalize(): this {
    return this.divide(this.getLength() || 1)
  }

  /**
   * Sets this euler's properties from a `Matrix4`.
   */
  fromMatrix4(m: Matrix4): this {
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
        this[1] = Math.asin(Math.max(-1, Math.min(1, m13)))

        if (Math.abs(m13) < 1 - Number.EPSILON) {
          this[0] = Math.atan2(-m23, m33)
          this[2] = Math.atan2(-m12, m11)
        } else {
          this[0] = Math.atan2(m32, m22)
          this[2] = 0
        }

        break

      case 'YXZ':
        this[0] = Math.asin(-Math.max(-1, Math.min(1, m23)))

        if (Math.abs(m23) < 1 - Number.EPSILON) {
          this[1] = Math.atan2(m13, m33)
          this[2] = Math.atan2(m21, m22)
        } else {
          this[1] = Math.atan2(-m31, m11)
          this[2] = 0
        }

        break

      case 'ZXY':
        this[0] = Math.asin(Math.max(-1, Math.min(1, m32)))

        if (Math.abs(m32) < 1 - Number.EPSILON) {
          this[1] = Math.atan2(-m31, m33)
          this[2] = Math.atan2(-m12, m22)
        } else {
          this[1] = 0
          this[2] = Math.atan2(m21, m11)
        }

        break

      case 'ZYX':
        this[1] = Math.asin(-Math.max(-1, Math.min(1, m31)))

        if (Math.abs(m31) < 1 - Number.EPSILON) {
          this[0] = Math.atan2(m32, m33)
          this[2] = Math.atan2(m21, m11)
        } else {
          this[0] = 0
          this[2] = Math.atan2(-m12, m22)
        }

        break

      case 'YZX':
        this[2] = Math.asin(Math.max(-1, Math.min(1, m21)))

        if (Math.abs(m21) < 1 - Number.EPSILON) {
          this[0] = Math.atan2(-m23, m22)
          this[1] = Math.atan2(-m31, m11)
        } else {
          this[0] = 0
          this[1] = Math.atan2(m13, m33)
        }

        break

      case 'XZY':
        this[2] = Math.asin(-Math.max(-1, Math.min(1, m12)))

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

  /**
   * Sets this euler's properties from a `Quaternion`.
   */
  fromQuaternion(q: Quaternion): this {
    return this.fromMatrix4(this._m.fromQuaternion(q))
  }
}
