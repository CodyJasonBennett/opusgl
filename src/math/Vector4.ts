export class Vector4 extends Float32Array {
  readonly isVector4 = true

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

  copy(v: Vector4) {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    this.w = v.w

    return this
  }

  clone() {
    return new Vector4().copy(this)
  }

  add(t: number | Vector4) {
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

  sub(t: number | Vector4) {
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

  multiply(t: number | Vector4) {
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

  divide(t: number | Vector4) {
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

  equals(v: Vector4) {
    // prettier-ignore
    return (
      this.x === v.x &&
      this.y === v.y &&
      this.z === v.z &&
      this.w === v.w
    )
  }

  negate() {
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

  dot(v: Vector4) {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w
  }

  lerp(v: Vector4, t: number) {
    this.x += t * (v.x - this.x)
    this.x += t * (v.y - this.y)
    this.x += t * (v.z - this.z)
    this.w += t * (v.w - this.w)

    return this
  }
}
