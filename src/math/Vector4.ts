/**
 * Calculates a four-dimensional (x, y, z, w) vector.
 */
export class Vector4 extends Array {
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
   * Sets this vector's x, y, z, and w properties.
   */
  set(x: number, y: number, z: number, w: number): this {
    this.x = x
    this.y = y
    this.z = z
    this.w = w

    return this
  }

  /**
   * Copies properties from another `Vector4`.
   */
  copy(v: Vector4): this {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    this.w = v.w

    return this
  }

  /**
   * Constructs a new `Vector4` with identical properties.
   */
  clone(): Vector4 {
    return new Vector4().copy(this)
  }

  /**
   * Adds a scalar or `Vector4`.
   */
  add(t: number | Vector4): this {
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
   * Subtracts a scalar or `Vector4`.
   */
  sub(t: number | Vector4): this {
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
   * Multiplies a scalar or `Vector4`.
   */
  multiply(t: number | Vector4): this {
    if (typeof t === 'number') {
      this.x *= t
      this.y *= t
      this.z *= t
      this.w *= t
    } else {
      this.x *= t.x
      this.y *= t.y
      this.z *= t.z
      this.w *= t.w
    }

    return this
  }

  /**
   * Divides a scalar of `Vector4`.
   */
  divide(t: number | Vector4): this {
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
   * Checks for strict equality with another `Vector4`.
   */
  equals(v: Vector4): boolean {
    // prettier-ignore
    return (
      this.x === v.x &&
      this.y === v.y &&
      this.z === v.z &&
      this.w === v.w
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
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w
  }

  /**
   * Calculates the Euclidean length of this vector.
   */
  getLength(): number {
    return Math.hypot(this.x, this.y, this.z, this.w)
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
   * Returns the distance to another `Vector4`.
   */
  distanceTo(v: Vector4): number {
    return v.getLength() - this.getLength()
  }

  /**
   * Calculates the dot product between another `Vector4`.
   */
  dot(v: Vector4): number {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w
  }

  /**
   * Lerps between another `Vector4` with a given alpha (`t`).
   */
  lerp(v: Vector4, t: number): this {
    this.x += t * (v.x - this.x)
    this.x += t * (v.y - this.y)
    this.x += t * (v.z - this.z)
    this.w += t * (v.w - this.w)

    return this
  }
}
