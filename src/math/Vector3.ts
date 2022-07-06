import type { Quaternion } from './Quaternion'
import type { Matrix4 } from './Matrix4'

/**
 * Calculates a three-dimensional (x, y, z) vector.
 */
export class Vector3 extends Array {
  constructor(x = 0, y = x, z = x) {
    super(3)
    this.set(x, y, z)
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
   * Sets this vector's x, y, and z properties.
   */
  set(x: number, y: number = x, z: number = x): this {
    this.x = x
    this.y = y
    this.z = z

    return this
  }

  /**
   * Copies properties from another `Vector3`.
   */
  copy(v: Vector3): this {
    this.x = v.x
    this.y = v.y
    this.z = v.z

    return this
  }

  /**
   * Constructs a new `Vector3` with identical properties.
   */
  clone(): Vector3 {
    return new Vector3().copy(this)
  }

  /**
   * Adds a scalar or `Vector3`.
   */
  add(t: number | Vector3): this {
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
   * Subtracts a scalar or `Vector3`.
   */
  sub(t: number | Vector3): this {
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
   * Multiplies a scalar or `Vector3`.
   */
  multiply(t: number | Vector3): this {
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
   * Divides a scalar of `Vector3`.
   */
  divide(t: number | Vector3): this {
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
   * Checks for strict equality with another `Vector3`.
   */
  equals(v: Vector3): boolean {
    // prettier-ignore
    return (
      this.x === v.x &&
      this.y === v.y &&
      this.z === v.z
    )
  }

  /**
   * Negates or calculates the inverse of this vector.
   */
  negate(): this {
    return this.multiply(-1)
  }

  /**
   * Calculates the square of the Euclidean length of this vector.
   */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  /**
   * Calculates the Euclidean length of this vector.
   */
  getLength(): number {
    return Math.hypot(this.x, this.y, this.z)
  }

  /**
   * Sets this vector to a length of `l` with the same direction.
   */
  setLength(l: number): this {
    return this.normalize().multiply(l)
  }

  /**
   * Normalizes this vector.
   */
  normalize(): this {
    return this.divide(this.getLength() || 1)
  }

  /**
   * Returns the distance to another `Vector3`.
   */
  distanceTo(v: Vector3): number {
    return v.getLength() - this.getLength()
  }

  /**
   * Calculates the dot product between another `Vector3`.
   */
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  /**
   * Calculates the cross product between another `Vector3`.
   */
  cross(v: Vector3): this {
    return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x)
  }

  /**
   * Lerps between another `Vector3` with a given alpha (`t`).
   */
  lerp(v: Vector3, t: number): this {
    return this.set(v.x - this.x, v.y - this.y, v.z - this.z).multiply(t)
  }

  /**
   * Applies rotations from a `Quaternion` to this vector.
   */
  applyQuaternion(q: Quaternion): this {
    // calculate quat * vector
    const ix = q.w * this.x + q.y * this.z - q.z * this.y
    const iy = q.w * this.y + q.z * this.x - q.x * this.z
    const iz = q.w * this.z + q.x * this.y - q.y * this.x
    const iw = -q.x * this.x - q.y * this.y - q.z * this.z

    // calculate result * inverse quat
    return this.set(
      ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
      iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
      iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
    )
  }

  /**
   * Applies transforms from a `Matrix4` to this vector.
   */
  applyMatrix4(m: Matrix4): this {
    const w = m[3] * this.x + m[7] * this.y + m[11] * this.z + m[15] || 1

    return this.set(
      (m[0] * this.x + m[4] * this.y + m[8] * this.z + m[12]) / w,
      (m[1] * this.x + m[5] * this.y + m[9] * this.z + m[13]) / w,
      (m[2] * this.x + m[6] * this.y + m[10] * this.z + m[14]) / w,
    )
  }
}
