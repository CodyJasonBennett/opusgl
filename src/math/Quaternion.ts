import type { Euler } from './Euler'
import type { Vector3 } from './Vector3'

/**
 * Calculates a quaternion with a defined rotation axis (x, y, z) and magnitude (w).
 */
export class Quaternion extends Array {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    super(4)
    this.set(x, y, z, w)
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

  get w(): number {
    return this[3]
  }

  set w(w) {
    this[3] = w
  }

  /**
   * Sets this quaternion's x, y, z, and w properties.
   */
  set(x: number, y: number, z: number, w: number): this {
    this.x = x
    this.y = y
    this.z = z
    this.w = w

    return this
  }

  /**
   * Copies properties from another `Quaternion`.
   */
  copy(q: Quaternion): this {
    this.x = q.x
    this.y = q.y
    this.z = q.z
    this.w = q.w

    return this
  }

  /**
   * Constructs a new `Quaternion` with identical properties.
   */
  clone(): Quaternion {
    return new Quaternion().copy(this)
  }

  /**
   * Resets to an identity quaternion.
   */
  identity(): this {
    return this.set(0, 0, 0, 1)
  }

  /**
   * Adds a scalar or `Quaternion`.
   */
  add(t: number | Quaternion): this {
    if (typeof t === 'number') {
      this.x += t
      this.y += t
      this.z += t
      this.w += t
    } else {
      this.x += t.x
      this.y += t.y
      this.z += t.z
      this.w += t.w
    }

    return this
  }

  /**
   * Subtracts a scalar or `Quaternion`.
   */
  sub(t: number | Quaternion): this {
    if (typeof t === 'number') {
      this.x -= t
      this.y -= t
      this.z -= t
      this.w -= t
    } else {
      this.x -= t.x
      this.y -= t.y
      this.z -= t.z
      this.w -= t.w
    }

    return this
  }

  /**
   * Multiplies a scalar or `Quaternion`.
   */
  multiply(t: number | Quaternion): this {
    if (typeof t === 'number') {
      this.x *= t
      this.y *= t
      this.z *= t
      this.w *= t
    } else {
      this.set(
        this.x * t.w + this.w * t.x + this.y * t.z - this.z * t.y,
        this.y * t.w + this.w * t.y + this.z * t.x - this.x * t.z,
        this.z * t.w + this.w * t.z + this.x * t.y - this.y * t.x,
        this.w * t.w - this.x * t.x - this.y * t.y - this.z * t.z,
      )
    }

    return this
  }

  /**
   * Divides a scalar of `Quaternion`.
   */
  divide(t: number | Quaternion): this {
    if (typeof t === 'number') {
      this.x /= t
      this.y /= t
      this.z /= t
      this.w /= t
    } else {
      this.x /= t.x
      this.y /= t.y
      this.z /= t.z
      this.w /= t.w
    }

    return this
  }

  /**
   * Checks for strict equality with another `Quaternion`.
   */
  equals(q: Quaternion): boolean {
    // prettier-ignore
    return (
      this.x === q.x &&
      this.y === q.y &&
      this.z === q.z &&
      this.w === q.w
    )
  }

  /**
   * Calculates the conjugate or inverse of this quaternion.
   */
  conjugate(): this {
    this.x *= -1
    this.y *= -1
    this.z *= -1

    return this
  }

  /**
   * Returns the Euclidean length of this quaternion.
   */
  getLength(): number {
    return Math.hypot(this.x, this.y, this.z, this.w)
  }

  /**
   * Normalizes this quaternion.
   */
  normalize(): this {
    return this.divide(this.getLength() || 1)
  }

  /**
   * Calculates the dot product between another `Quaternion`.
   */
  dot(q: Quaternion): number {
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w
  }

  /**
   * Slerps between another `Quaternion` with a given alpha (`t`).
   */
  slerp(q: Quaternion, t: number): this {
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

  /**
   * Applies this quaternion's rotation axis and angle to `axis`.
   */
  getAxisAngle(axis: Vector3): Vector3 {
    const rad = Math.acos(this.w) * 2
    const s = Math.sin(rad / 2)

    if (s > Number.EPSILON) {
      return axis.set(this.x / s, this.y / s, this.z / s)
    } else {
      return axis.set(1, 0, 0)
    }
  }

  /**
   * Applies the rotation from a `Euler` in order.
   */
  applyEuler(e: Euler): this {
    for (const axis of e.order) {
      switch (axis) {
        case 'X': {
          const x = Math.sin(e.x / 2)
          const w = Math.cos(e.x / 2)

          this.set(this.x * w + this.w * x, this.y * w + this.z * x, this.z * w - this.y * x, this.w * w - this.x * x)
          break
        }
        case 'Y': {
          const y = Math.sin(e.y / 2)
          const w = Math.cos(e.y / 2)

          this.set(this.x * w - this.z * y, this.y * w + this.w * y, this.z * w + this.x * y, this.w * w - this.y * y)
          break
        }
        case 'Z': {
          const z = Math.sin(e.z / 2)
          const w = Math.cos(e.z / 2)

          this.set(this.x * w + this.y * z, this.y * w - this.x * z, this.z * w + this.w * z, this.w * w - this.z * z)
          break
        }
      }
    }

    return this
  }

  /**
   * Sets this quaternion's properties from a `Euler`.
   */
  fromEuler(e: Euler): this {
    return this.identity().applyEuler(e)
  }
}
