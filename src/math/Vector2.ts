/**
 * Calculates a two-dimensional (x, y) vector.
 */
export class Vector2 extends Array {
  constructor(x = 0, y = x) {
    super(2)
    this.set(x, y)
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

  /**
   * Sets this vector's x, and y properties.
   */
  set(x: number, y: number = x) {
    this.x = x
    this.y = y

    return this
  }

  /**
   * Copies properties from another `Vector2`.
   */
  copy(v: Vector2) {
    this.x = v.x
    this.y = v.y

    return this
  }

  /**
   * Constructs a new `Vector2` with identical properties.
   */
  clone() {
    return new Vector2().copy(this)
  }

  /**
   * Adds a scalar or `Vector2`.
   */
  add(t: number | Vector2) {
    if (typeof t === 'number') {
      this.x += t
      this.y += t
    } else {
      this.x += t.x
      this.y += t.y
    }

    return this
  }

  /**
   * Subtracts a scalar or `Vector2`.
   */
  sub(t: number | Vector2) {
    if (typeof t === 'number') {
      this.x -= t
      this.y -= t
    } else {
      this.x -= t.x
      this.y -= t.y
    }

    return this
  }

  /**
   * Multiplies a scalar or `Vector2`.
   */
  multiply(t: number | Vector2) {
    if (typeof t === 'number') {
      this.x *= t
      this.y *= t
    } else {
      this.x *= t.x
      this.y *= t.y
    }

    return this
  }

  /**
   * Divides a scalar of `Vector2`.
   */
  divide(t: number | Vector2) {
    if (typeof t === 'number') {
      this.x /= t
      this.y /= t
    } else {
      this.x /= t.x
      this.y /= t.y
    }

    return this
  }

  /**
   * Checks for strict equality with another `Vector2`.
   */
  equals(v: Vector2) {
    // prettier-ignore
    return (
      this.x === v.x &&
      this.y === v.y
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
    return this.x * this.x + this.y * this.y
  }

  /**
   * Calculates the Euclidean length of this vector.
   */
  getLength() {
    return Math.hypot(this.x, this.y)
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
   * Returns the distance to another `Vector2`.
   */
  distanceTo(v: Vector2) {
    return v.getLength() - this.getLength()
  }

  /**
   * Calculates the dot product between another `Vector2`.
   */
  dot(v: Vector2) {
    return this.x * v.x + this.y * v.y
  }

  /**
   * Calculates the cross product between another `Vector2`.
   */
  cross(v: Vector2) {
    return this.x * v.y - this.y * v.x
  }

  /**
   * Lerps between another `Vector2` with a given alpha (`t`).
   */
  lerp(v: Vector2, t: number) {
    this.x += t * (v.x - this.x)
    this.x += t * (v.y - this.y)

    return this
  }
}
