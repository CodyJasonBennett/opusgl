export class Vector2 {
  readonly isVector2 = true
  public x: number
  public y: number;

  *[Symbol.iterator]() {
    yield this.x
    yield this.y
  }

  constructor(x = 0, y = x) {
    this.set(x, y)
  }

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
    return new Vector2(this.x, this.y)
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
}
