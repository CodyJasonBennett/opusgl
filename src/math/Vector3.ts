export class Vector3 {
  readonly isVector3 = true
  public x: number
  public y: number
  public z: number;

  *[Symbol.iterator]() {
    yield this.x
    yield this.y
    yield this.z
  }

  constructor(x = 0, y = x, z = x) {
    this.set(x, y, z)
  }

  set(x: number, y: number = x, z: number = x) {
    this.x = x
    this.y = y
    this.z = z

    return this
  }

  copy(v: Vector3) {
    this.x = v.x
    this.y = v.y
    this.z = v.z

    return this
  }

  clone() {
    return new Vector3(this.x, this.y, this.z)
  }

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
}
