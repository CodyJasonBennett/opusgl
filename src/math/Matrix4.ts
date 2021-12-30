import { MathArray } from './MathArray'

export class Matrix4 extends MathArray {
  readonly isMatrix4 = true

  constructor(
    m00 = 1,
    m01 = 0,
    m02 = 0,
    m03 = 0,
    m10 = 0,
    m11 = 1,
    m12 = 0,
    m13 = 0,
    m20 = 0,
    m21 = 0,
    m22 = 1,
    m23 = 0,
    m30 = 0,
    m31 = 0,
    m32 = 0,
    m33 = 1,
  ) {
    super(16, null)
    this.set(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
  }

  set(
    m00: number,
    m01: number,
    m02: number,
    m03: number,
    m10: number,
    m11: number,
    m12: number,
    m13: number,
    m20: number,
    m21: number,
    m22: number,
    m23: number,
    m30: number,
    m31: number,
    m32: number,
    m33: number,
  ) {
    this[0] = m00
    this[1] = m01
    this[2] = m02
    this[3] = m03

    this[4] = m10
    this[5] = m11
    this[6] = m12
    this[7] = m13

    this[8] = m20
    this[9] = m21
    this[10] = m22
    this[11] = m23

    this[12] = m30
    this[13] = m31
    this[14] = m32
    this[15] = m33

    return this
  }

  copy(m: Matrix4) {
    this[0] = m[0]
    this[1] = m[1]
    this[2] = m[2]
    this[3] = m[3]

    this[4] = m[4]
    this[5] = m[5]
    this[6] = m[6]
    this[7] = m[7]

    this[8] = m[8]
    this[9] = m[9]
    this[10] = m[10]
    this[11] = m[11]

    this[12] = m[12]
    this[13] = m[13]
    this[14] = m[14]
    this[15] = m[15]

    return this
  }

  clone() {
    return new Matrix4().copy(this)
  }

  identity() {
    return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
  }

  add(t: number | Matrix4) {
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
      this[9] += t
      this[10] += t
      this[11] += t

      this[12] += t
      this[13] += t
      this[14] += t
      this[15] += t
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
      this[9] += t[9]
      this[10] += t[10]
      this[11] += t[11]

      this[12] += t[12]
      this[13] += t[13]
      this[14] += t[14]
      this[15] += t[15]
    }

    return this
  }

  sub(t: number | Matrix4) {
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
      this[9] -= t
      this[10] -= t
      this[11] -= t

      this[12] -= t
      this[13] -= t
      this[14] -= t
      this[15] -= t
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
      this[9] -= t[9]
      this[10] -= t[10]
      this[11] -= t[11]

      this[12] -= t[12]
      this[13] -= t[13]
      this[14] -= t[14]
      this[15] -= t[15]
    }

    return this
  }

  multiply(t: number | Matrix4) {
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
      this[9] *= t
      this[10] *= t
      this[11] *= t

      this[12] *= t
      this[13] *= t
      this[14] *= t
      this[15] *= t
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
      this[9] *= t[9]
      this[10] *= t[10]
      this[11] *= t[11]

      this[12] *= t[12]
      this[13] *= t[13]
      this[14] *= t[14]
      this[15] *= t[15]
    }

    return this
  }

  divide(t: number | Matrix4) {
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
      this[9] /= t
      this[10] /= t
      this[11] /= t

      this[12] /= t
      this[13] /= t
      this[14] /= t
      this[15] /= t
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
      this[9] /= t[9]
      this[10] /= t[10]
      this[11] /= t[11]

      this[12] /= t[12]
      this[13] /= t[13]
      this[14] /= t[14]
      this[15] /= t[15]
    }

    return this
  }

  equals(m: Matrix4) {
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

      this[8] === m[8] &&
      this[9] === m[9] &&
      this[10] === m[10] &&
      this[11] === m[11] &&

      this[12] === m[12] &&
      this[13] === m[13] &&
      this[14] === m[14] &&
      this[15] === m[15]
    )
  }

  negate() {
    return this.multiply(-1)
  }

  transpose(m: Matrix4 = this) {
    this[0] = m[0]
    this[1] = m[4]
    this[2] = m[8]
    this[3] = m[12]
    this[4] = m[1]
    this[5] = m[5]
    this[6] = m[9]
    this[7] = m[13]
    this[8] = m[2]
    this[9] = m[6]
    this[10] = m[10]
    this[11] = m[14]
    this[12] = m[3]
    this[13] = m[7]
    this[14] = m[11]
    this[15] = m[15]

    return this
  }
}
