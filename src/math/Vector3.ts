/**
 * Calculates a three-dimensional (x, y, z) vector.
 */
export class Vector3 extends Array {
  constructor(x = 0, y = x, z = x) {
    super(3)
    this.set(x, y, z)
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

  /**
   * Sets this vector's x, y, and z properties.
   */
  set(x: number, y: number = x, z: number = x) {
    this.x = x
    this.y = y
    this.z = z

    return this
  }

  /**
   * Copies properties from another `Vector3`.
   */
  copy(v: Vector3) {
    this.x = v.x
    this.y = v.y
    this.z = v.z

    return this
  }

  /**
   * Constructs a new `Vector3` with identical properties.
   */
  clone() {
    return new Vector3().copy(this)
  }

  /**
   * Adds a scalar or `Vector3`.
   */
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

  /**
   * Subtracts a scalar or `Vector3`.
   */
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

  /**
   * Multiplies a scalar or `Vector3`.
   */
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

  /**
   * Divides a scalar of `Vector3`.
   */
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

  /**
   * Checks for strict equality with another `Vector3`.
   */
  equals(v: Vector3) {
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
  negate() {
    return this.multiply(-1)
  }

  /**
   * Calculates the square of the Euclidean length of this vector.
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  /**
   * Calculates the Euclidean length of this vector.
   */
  getLength() {
    return Math.hypot(this.x, this.y, this.z)
  }

  /**
   * Sets this vector to a length of `l` with the same direction.
   */
  setLength(l: number) {
    return this.normalize().multiply(l)
  }

  /**
   * Normalizes this vector.
   */
  normalize() {
    return this.divide(this.getLength() || 1)
  }

  /**
   * Returns the distance to another `Vector3`.
   */
  distanceTo(v: Vector3) {
    return v.getLength() - this.getLength()
  }

  /**
   * Calculates the dot product between another `Vector3`.
   */
  dot(v: Vector3) {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  /**
   * Calculates the cross product between another `Vector3`.
   */
  cross(v: Vector3) {
    return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x)
  }

  /**
   * Lerps between another `Vector3` with a given alpha (`t`).
   */
  lerp(v: Vector3, t: number) {
    return this.set(v.x - this.x, v.y - this.y, v.z - this.z).multiply(t)
  }
}
