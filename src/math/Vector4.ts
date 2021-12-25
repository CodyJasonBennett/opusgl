export class Vector4 {
  readonly isVector4 = true
  public x: number
  public y: number
  public z: number
  public w: number;

  *[Symbol.iterator]() {
    yield this.x
    yield this.y
    yield this.z
    yield this.w
  }

  constructor(x = 0, y = x, z = x, w = 1) {
    this.set(x, y, z, w)
  }

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
    return new Vector4(this.x, this.y, this.z, this.w)
  }

  add(t: number | Vector4) {
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

  sub(t: number | Vector4) {
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

  multiply(t: number | Vector4) {
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

  divide(t: number | Vector4) {
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
}
