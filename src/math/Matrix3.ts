import type { Matrix4 } from './Matrix4'

/**
 * Calculates a 3x3 matrix.
 */
export class Matrix3 extends Array {
  constructor(m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0, m20 = 0, m21 = 0, m22 = 1) {
    super(9)
    this.set(m00, m01, m02, m10, m11, m12, m20, m21, m22)
  }

  /**
   * Sets this matrix's elements.
   */
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
  ): this {
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

  /**
   * Copies elements from another `Matrix3`.
   */
  copy(m: Matrix3): this {
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

  /**
   * Constructs a new `Matrix3` with identical elements.
   */
  clone(): Matrix3 {
    return new Matrix3().copy(this)
  }

  /**
   * Resets to an identity matrix.
   */
  identity(): this {
    return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1)
  }

  /**
   * Multiplies a scalar or `Matrix3`.
   */
  multiply(t: number | Matrix3): this {
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
      this.set(
        this[0] * t[0] + this[3] * t[1] + this[6] * t[2],
        this[1] * t[0] + this[4] * t[1] + this[7] * t[2],
        this[2] * t[0] + this[5] * t[1] + this[8] * t[2],
        this[0] * t[3] + this[3] * t[4] + this[6] * t[5],
        this[1] * t[3] + this[4] * t[4] + this[7] * t[5],
        this[2] * t[3] + this[5] * t[4] + this[8] * t[5],
        this[0] * t[6] + this[3] * t[7] + this[6] * t[8],
        this[1] * t[6] + this[4] * t[7] + this[7] * t[8],
        this[2] * t[6] + this[5] * t[7] + this[8] * t[8],
      )
    }

    return this
  }

  /**
   * Checks for strict equality with another `Matrix3`.
   */
  equals(m: Matrix3): boolean {
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

  /**
   * Transposes this matrix in place over its diagonal.
   */
  transpose(): this {
    return this.set(this[0], this[3], this[6], this[1], this[4], this[7], this[2], this[5], this[8])
  }

  /**
   * Returns the determinant of this matrix.
   */
  determinant(): number {
    return (
      this[0] * (this[8] * this[4] - this[5] * this[7]) +
      this[1] * (-this[8] * this[3] + this[5] * this[6]) +
      this[2] * (this[7] * this[3] - this[4] * this[6])
    )
  }

  /**
   * Calculates the inverse of this matrix (no-op with determinant of `0`).
   */
  invert(): this {
    // Make sure we're not dividing by zero
    const det = this.determinant()
    if (!det) return this

    const invDet = 1 / det

    return this.set(
      this[8] * this[4] - this[5] * this[7],
      -this[8] * this[1] + this[2] * this[7],
      this[5] * this[1] - this[2] * this[4],
      -this[8] * this[3] + this[5] * this[6],
      this[8] * this[0] - this[2] * this[6],
      -this[5] * this[0] + this[2] * this[3],
      this[7] * this[3] - this[4] * this[6],
      -this[7] * this[0] + this[1] * this[6],
      this[4] * this[0] - this[1] * this[3],
    ).multiply(invDet)
  }

  /**
   * Sets this matrix's elements from a `Matrix4`.
   */
  fromMatrix4(m: Matrix4): this {
    return this.set(m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10])
  }

  /**
   * Calculates a normal matrix from a model-view matrix.
   */
  getNormalMatrix(m: Matrix4): this {
    return this.fromMatrix4(m).invert().transpose()
  }
}
