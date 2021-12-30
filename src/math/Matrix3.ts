import { MathArray } from './MathArray'

export class Matrix3 extends MathArray {
  readonly isMatrix3 = true

  constructor(m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0, m20 = 0, m21 = 0, m22 = 1) {
    super(9, null)
    this.set(m00, m01, m02, m10, m11, m12, m20, m21, m22)
  }

  set(
    m00: number,
    m01: number,
    m02: number,
    m10: number,
    m11: number,
    m12: number,
    m20: number,
    m21: number,
    m22: number,
  ) {
    this[0] = m00
    this[1] = m01
    this[2] = m02

    this[3] = m10
    this[4] = m11
    this[5] = m12

    this[6] = m20
    this[7] = m21
    this[8] = m22

    return this
  }

  copy(m: Matrix3) {
    this[0] = m[0]
    this[1] = m[1]
    this[2] = m[2]

    this[3] = m[3]
    this[4] = m[4]
    this[5] = m[5]

    this[6] = m[6]
    this[7] = m[7]
    this[8] = m[8]

    return this
  }

  clone() {
    return new Matrix3().copy(this)
  }

  identity() {
    return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1)
  }

  add(t: number | Matrix3) {
    if (typeof t === 'number') {
      this[0] += t
      this[1] += t
      this[2] += t

      this[3] += t
      this[4] += t
      this[5] += t

      this[6] += t
      this[7] += t
      this[8] += t
    } else {
      this[0] += t[0]
      this[1] += t[1]
      this[2] += t[2]

      this[3] += t[3]
      this[4] += t[4]
      this[5] += t[5]

      this[6] += t[6]
      this[7] += t[7]
      this[8] += t[8]
    }

    return this
  }

  sub(t: number | Matrix3) {
    if (typeof t === 'number') {
      this[0] -= t
      this[1] -= t
      this[2] -= t

      this[3] -= t
      this[4] -= t
      this[5] -= t

      this[6] -= t
      this[7] -= t
      this[8] -= t
    } else {
      this[0] -= t[0]
      this[1] -= t[1]
      this[2] -= t[2]

      this[3] -= t[3]
      this[4] -= t[4]
      this[5] -= t[5]

      this[6] -= t[6]
      this[7] -= t[7]
      this[8] -= t[8]
    }

    return this
  }

  multiply(t: number | Matrix3) {
    if (typeof t === 'number') {
      this[0] *= t
      this[1] *= t
      this[2] *= t

      this[3] *= t
      this[4] *= t
      this[5] *= t

      this[6] *= t
      this[7] *= t
      this[8] *= t
    } else {
      this[0] *= t[0]
      this[1] *= t[1]
      this[2] *= t[2]

      this[3] *= t[3]
      this[4] *= t[4]
      this[5] *= t[5]

      this[6] *= t[6]
      this[7] *= t[7]
      this[8] *= t[8]
    }

    return this
  }

  divide(t: number | Matrix3) {
    if (typeof t === 'number') {
      this[0] /= t
      this[1] /= t
      this[2] /= t

      this[3] /= t
      this[4] /= t
      this[5] /= t

      this[6] /= t
      this[7] /= t
      this[8] /= t
    } else {
      this[0] /= t[0]
      this[1] /= t[1]
      this[2] /= t[2]

      this[3] /= t[3]
      this[4] /= t[4]
      this[5] /= t[5]

      this[6] /= t[6]
      this[7] /= t[7]
      this[8] /= t[8]
    }

    return this
  }

  equals(m: Matrix3) {
    // prettier-ignore
    return (
      this[0] === m[0] &&
      this[1] === m[1] &&
      this[2] === m[2] &&

      this[3] === m[3] &&
      this[4] === m[4] &&
      this[5] === m[5] &&
 
      this[6] === m[6] &&
      this[7] === m[7] &&
      this[8] === m[8]
    )
  }

  negate() {
    return this.multiply(-1)
  }

  transpose(m: Matrix3 = this) {
    this[0] = m[0]
    this[1] = m[3]
    this[2] = m[6]
    this[3] = m[1]
    this[4] = m[4]
    this[5] = m[7]
    this[6] = m[2]
    this[7] = m[5]
    this[8] = m[8]

    return this
  }
}
