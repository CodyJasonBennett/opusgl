export class Vector2 extends Float32Array {
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

  // @ts-ignore
  set(x: number, y: number = x) {
    this.x = x
    this.y = y

    return this
  }

  copy(v: Vector2) {
    this.x = v.x
    this.y = v.y

    return this
  }

  clone() {
    return new Vector2().copy(this)
  }

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

  equals(v: Vector2) {
    // prettier-ignore
    return (
      this.x === v.x &&
      this.y === v.y
    )
  }

  negate() {
    return this.multiply(-1)
  }

  getLength() {
    return Math.hypot(this.x, this.y)
  }

  setLength(l: number) {
    return this.normalize().multiply(l)
  }

  normalize() {
    return this.divide(this.getLength() || 1)
  }

  distanceTo(v: Vector2) {
    return v.getLength() - this.getLength()
  }

  inverse() {
    this.x = 1 / this.x
    this.y = 1 / this.y

    return this
  }

  dot(v: Vector2) {
    return this.x * v.x + this.y * v.y
  }

  cross(v: Vector2) {
    return this.x * v.y - this.y * v.x
  }

  lerp(v: Vector2, t: number) {
    this.x += t * (v.x - this.x)
    this.x += t * (v.y - this.y)

    return this
  }
}
