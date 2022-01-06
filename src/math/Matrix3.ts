import { MathArray } from './MathArray'
import type { Vector2 } from './Vector2'
import type { Matrix4 } from './Matrix4'

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
      this[0] = this[0] * t[0] + this[3] * t[1] + this[6] * t[2]
      this[3] = this[0] * t[3] + this[3] * t[4] + this[6] * t[5]
      this[6] = this[0] * t[6] + this[3] * t[7] + this[6] * t[8]

      this[1] = this[1] * t[0] + this[4] * t[1] + this[7] * t[2]
      this[4] = this[1] * t[3] + this[4] * t[4] + this[7] * t[5]
      this[7] = this[1] * t[6] + this[4] * t[7] + this[7] * t[8]

      this[2] = this[2] * t[0] + this[5] * t[1] + this[8] * t[2]
      this[5] = this[2] * t[3] + this[5] * t[4] + this[8] * t[5]
      this[8] = this[2] * t[6] + this[5] * t[7] + this[8] * t[8]
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

  transpose() {
    const a01 = this[1]
    const a02 = this[2]
    const a12 = this[5]

    this[1] = this[3]
    this[2] = this[6]
    this[3] = a01
    this[5] = this[7]
    this[6] = a02
    this[7] = a12

    return this
  }

  getNormalMatrix(m: Matrix4) {
    return this.fromMatrix4(m).invert().transpose()
  }

  determinant() {
    return (
      this[0] * (this[8] * this[4] - this[5] * this[7]) +
      this[1] * (-this[8] * this[3] + this[5] * this[6]) +
      this[2] * (this[7] * this[3] - this[4] * this[6])
    )
  }

  invert() {
    const b01 = this[8] * this[4] - this[5] * this[7]
    const b11 = -this[8] * this[3] + this[5] * this[6]
    const b21 = this[7] * this[3] - this[4] * this[6]

    const invDet = 1 / this.determinant()

    this[0] = b01 * invDet
    this[1] = (-this[8] * this[1] + this[2] * this[7]) * invDet
    this[2] = (this[5] * this[1] - this[2] * this[4]) * invDet
    this[3] = b11 * invDet
    this[4] = (this[8] * this[0] - this[2] * this[6]) * invDet
    this[5] = (-this[5] * this[0] + this[2] * this[3]) * invDet
    this[6] = b21 * invDet
    this[7] = (-this[7] * this[0] + this[1] * this[6]) * invDet
    this[8] = (this[4] * this[0] - this[1] * this[3]) * invDet

    return this
  }

  translate(v: Vector2) {
    this[0] += v.x * this[2]
    this[3] += v.x * this[5]
    this[6] += v.x * this[8]
    this[1] += v.y * this[2]
    this[4] += v.y * this[5]
    this[7] += v.y * this[8]

    return this
  }

  scale(v: Vector2) {
    this[0] *= v.x
    this[3] *= v.x
    this[6] *= v.x
    this[1] *= v.y
    this[4] *= v.y
    this[7] *= v.y

    return this
  }

  rotate(radians: number) {
    const c = Math.cos(radians)
    const s = Math.sin(radians)

    this[0] = c * this[0] + s * this[1]
    this[3] = c * this[3] + s * this[4]
    this[6] = c * this[6] + s * this[7]

    this[1] = -s * this[0] + c * this[1]
    this[4] = -s * this[3] + c * this[4]
    this[7] = -s * this[6] + c * this[7]

    return this
  }

  fromMatrix4(m: Matrix4) {
    return this.set(m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10])
  }
}
