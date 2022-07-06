import { Vector3 } from './Vector3'
import type { Quaternion } from './Quaternion'

const _zero = new Vector3(0, 0, 0)
const _one = new Vector3(1, 1, 1)
const _v = new Vector3()

/**
 * Calculates a 4x4 matrix.
 */
export class Matrix4 extends Array {
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
    super(16)
    this.set(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
  }

  /**
   * Sets this matrix's elements.
   */
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
  ): this {
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

  /**
   * Copies elements from another `Matrix4`.
   */
  copy(m: Matrix4): this {
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

  /**
   * Constructs a new `Matrix4` with identical elements.
   */
  clone(): Matrix4 {
    return new Matrix4().copy(this)
  }

  /**
   * Resets to an identity matrix.
   */
  identity(): this {
    return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
  }

  /**
   * Multiplies a scalar or `Matrix4`.
   */
  multiply(t: number | Matrix4): this {
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
      this.set(
        this[0] * t[0] + this[4] * t[1] + this[8] * t[2] + this[12] * t[3],
        this[1] * t[0] + this[5] * t[1] + this[9] * t[2] + this[13] * t[3],
        this[2] * t[0] + this[6] * t[1] + this[10] * t[2] + this[14] * t[3],
        this[3] * t[0] + this[7] * t[1] + this[11] * t[2] + this[15] * t[3],
        this[0] * t[4] + this[4] * t[5] + this[8] * t[6] + this[12] * t[7],
        this[1] * t[4] + this[5] * t[5] + this[9] * t[6] + this[13] * t[7],
        this[2] * t[4] + this[6] * t[5] + this[10] * t[6] + this[14] * t[7],
        this[3] * t[4] + this[7] * t[5] + this[11] * t[6] + this[15] * t[7],
        this[0] * t[8] + this[4] * t[9] + this[8] * t[10] + this[12] * t[11],
        this[1] * t[8] + this[5] * t[9] + this[9] * t[10] + this[13] * t[11],
        this[2] * t[8] + this[6] * t[9] + this[10] * t[10] + this[14] * t[11],
        this[3] * t[8] + this[7] * t[9] + this[11] * t[10] + this[15] * t[11],
        this[0] * t[12] + this[4] * t[13] + this[8] * t[14] + this[12] * t[15],
        this[1] * t[12] + this[5] * t[13] + this[9] * t[14] + this[13] * t[15],
        this[2] * t[12] + this[6] * t[13] + this[10] * t[14] + this[14] * t[15],
        this[3] * t[12] + this[7] * t[13] + this[11] * t[14] + this[15] * t[15],
      )
    }

    return this
  }

  /**
   * Checks for strict equality with another `Matrix4`.
   */
  equals(m: Matrix4): boolean {
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

  /**
   * Returns the determinant of this matrix.
   */
  determinant(): number {
    const b0 = this[0] * this[5] - this[1] * this[4]
    const b1 = this[0] * this[6] - this[2] * this[4]
    const b2 = this[1] * this[6] - this[2] * this[5]
    const b3 = this[8] * this[13] - this[9] * this[12]
    const b4 = this[8] * this[14] - this[10] * this[12]
    const b5 = this[9] * this[14] - this[10] * this[13]
    const b6 = this[0] * b5 - this[1] * b4 + this[2] * b3
    const b7 = this[4] * b5 - this[5] * b4 + this[6] * b3
    const b8 = this[8] * b2 - this[9] * b1 + this[10] * b0
    const b9 = this[12] * b2 - this[13] * b1 + this[14] * b0

    return this[7] * b6 - this[3] * b7 + this[15] * b8 - this[11] * b9
  }

  /**
   * Transposes this matrix in place over its diagonal.
   */
  transpose(): this {
    return this.set(
      this[0],
      this[4],
      this[8],
      this[12],
      this[1],
      this[5],
      this[9],
      this[13],
      this[2],
      this[6],
      this[10],
      this[14],
      this[3],
      this[7],
      this[11],
      this[15],
    )
  }

  /**
   * Calculates a perspective projection matrix.
   *
   * Accepts a `normalized` argument, when true creates an WebGL `[-1, 1]` clipping space, and when false creates a WebGPU `[0, 1]` clipping space.
   */
  perspective(fov: number, aspect: number, near: number, far: number, normalized: boolean): this {
    // Degrees to radians
    fov *= Math.PI / 180

    const f = 1 / Math.tan(fov / 2)
    const depth = 1 / (near - far)

    this[0] = f / aspect
    this[1] = 0
    this[2] = 0
    this[3] = 0
    this[4] = 0
    this[5] = f
    this[6] = 0
    this[7] = 0
    this[8] = 0
    this[9] = 0
    this[11] = -1
    this[12] = 0
    this[13] = 0
    this[15] = 0

    if (normalized) {
      this[10] = (far + near) * depth
      this[14] = 2 * far * near * depth
    } else {
      this[10] = far * depth
      this[14] = far * near * depth
    }

    return this
  }

  /**
   * Calculates an orthographic projection matrix.
   *
   * Accepts a `normalized` argument, when true creates an WebGL `[-1, 1]` clipping space, and when false creates a WebGPU `[0, 1]` clipping space.
   */
  orthogonal(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
    normalized: boolean,
  ): this {
    const horizontal = 1 / (left - right)
    const vertical = 1 / (bottom - top)
    const depth = 1 / (near - far)

    this[0] = -2 * horizontal
    this[1] = 0
    this[2] = 0
    this[3] = 0
    this[4] = 0
    this[5] = -2 * vertical
    this[6] = 0
    this[7] = 0
    this[8] = 0
    this[9] = 0
    this[11] = 0
    this[12] = (left + right) * horizontal
    this[13] = (top + bottom) * vertical
    this[15] = 1

    if (normalized) {
      this[10] = 2 * depth
      this[14] = (far + near) * depth
    } else {
      this[10] = depth
      this[14] = near * depth
    }

    return this
  }

  /**
   * Calculates a rotation matrix from `eye` to `target`, assuming `up` as world-space up.
   */
  lookAt(eye: Vector3, target: Vector3, up: Vector3): this {
    const z = eye.clone().sub(target)

    // eye and target are in the same position
    if (!z.lengthSq()) {
      z.z = 1
    } else {
      z.normalize()
    }

    const x = up.clone().cross(z)

    // up and z are parallel
    if (!x.lengthSq()) {
      up = up.clone()

      if (up.z) {
        up.x += 1e-6
      } else if (up.y) {
        up.z += 1e-6
      } else {
        up.y += 1e-6
      }

      x.cross(up)
    }
    x.normalize()

    const y = z.clone().cross(x)

    this[0] = x.x
    this[1] = x.y
    this[2] = x.z
    this[3] = 0
    this[4] = y.x
    this[5] = y.y
    this[6] = y.z
    this[7] = 0
    this[8] = z.x
    this[9] = z.y
    this[10] = z.z
    this[11] = 0
    this[12] = eye.x
    this[13] = eye.y
    this[14] = eye.z
    this[15] = 1

    return this
  }

  /**
   * Translates this matrix with a `Vector3`.
   */
  translate(v: Vector3): this {
    this[12] += this[0] * v.x + this[4] * v.y + this[8] * v.z
    this[13] += this[1] * v.x + this[5] * v.y + this[9] * v.z
    this[14] += this[2] * v.x + this[6] * v.y + this[10] * v.z
    this[15] += this[3] * v.x + this[7] * v.y + this[11] * v.z

    return this
  }

  /**
   * Scales this matrix with a `Vector3`.
   */
  scale(v: Vector3): this {
    this[0] *= v.x
    this[1] *= v.x
    this[2] *= v.x
    this[3] *= v.x
    this[4] *= v.y
    this[5] *= v.y
    this[6] *= v.y
    this[7] *= v.y
    this[8] *= v.z
    this[9] *= v.z
    this[10] *= v.z
    this[11] *= v.z

    return this
  }

  /**
   * Rotates this matrix with an angle in radians against an axis.
   */
  rotate(radians: number, axis: Vector3): this {
    const length = axis.getLength()

    if (length < Number.EPSILON) return this

    axis.multiply(1 / length)

    const s = Math.sin(radians)
    const c = Math.cos(radians)
    const t = 1 - c

    const b00 = axis.x * axis.x * t + c
    const b02 = axis.z * axis.x * t - axis.y * s
    const b01 = axis.y * axis.x * t + axis.z * s
    const b10 = axis.x * axis.y * t - axis.z * s
    const b11 = axis.y * axis.y * t + c
    const b12 = axis.z * axis.y * t + axis.x * s
    const b20 = axis.x * axis.z * t + axis.y * s
    const b21 = axis.y * axis.z * t - axis.x * s
    const b22 = axis.z * axis.z * t + c

    return this.set(
      this[0] * b00 + this[4] * b01 + this[8] * b02,
      this[1] * b00 + this[5] * b01 + this[9] * b02,
      this[2] * b00 + this[6] * b01 + this[10] * b02,
      this[3] * b00 + this[7] * b01 + this[11] * b02,
      this[0] * b10 + this[4] * b11 + this[8] * b12,
      this[1] * b10 + this[5] * b11 + this[9] * b12,
      this[2] * b10 + this[6] * b11 + this[10] * b12,
      this[3] * b10 + this[7] * b11 + this[11] * b12,
      this[0] * b20 + this[4] * b21 + this[8] * b22,
      this[1] * b20 + this[5] * b21 + this[9] * b22,
      this[2] * b20 + this[6] * b21 + this[10] * b22,
      this[3] * b20 + this[7] * b21 + this[11] * b22,
      this[12],
      this[13],
      this[14],
      this[15],
    )
  }

  /**
   * Sets the properties of a `Vector3` from this matrix's world position.
   */
  getPosition(v: Vector3): Vector3 {
    return v.set(this[12], this[13], this[14])
  }

  /**
   * Sets the properties of a `Vector3` from this matrix's scale.
   */
  getScale(v: Vector3): Vector3 {
    return v.set(
      Math.hypot(this[0], this[1], this[2]),
      Math.hypot(this[4], this[5], this[6]),
      Math.hypot(this[8], this[9], this[10]),
    )
  }

  /**
   * Sets the properties of a `Quaternion` from this matrix's rotation.
   */
  getQuaternion(q: Quaternion): Quaternion {
    const scale = this.getScale(_v)

    const sm11 = this[0] * scale.x
    const sm12 = (this[1] * 1) / scale.y
    const sm13 = (this[2] * 1) / scale.z
    const sm21 = this[4] * scale.x
    const sm22 = (this[5] * 1) / scale.y
    const sm23 = (this[6] * 1) / scale.z
    const sm31 = this[8] * scale.x
    const sm32 = (this[9] * 1) / scale.y
    const sm33 = (this[10] * 1) / scale.z

    const trace = sm11 + sm22 + sm33

    if (trace > 0) {
      const S = Math.sqrt(trace + 1.0) * 2
      return q.set((sm23 - sm32) / S, (sm31 - sm13) / S, (sm12 - sm21) / S, 0.25 * S)
    } else if (sm11 > sm22 && sm11 > sm33) {
      const S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2
      return q.set(0.25 * S, (sm12 + sm21) / S, (sm31 + sm13) / S, (sm23 - sm32) / S)
    } else if (sm22 > sm33) {
      const S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2
      return q.set((sm12 + sm21) / S, 0.25 * S, (sm23 + sm32) / S, (sm31 - sm13) / S)
    } else {
      const S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2
      return q.set((sm31 + sm13) / S, (sm23 + sm32) / S, 0.25 * S, (sm12 - sm21) / S)
    }
  }

  /**
   * Composes this matrix's elements from position, quaternion, and scale properties.
   */
  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
    const xx = quaternion.x * (quaternion.x + quaternion.x)
    const xy = quaternion.x * (quaternion.y + quaternion.y)
    const xz = quaternion.x * (quaternion.z + quaternion.z)
    const yy = quaternion.y * (quaternion.y + quaternion.y)
    const yz = quaternion.y * (quaternion.z + quaternion.z)
    const zz = quaternion.z * (quaternion.z + quaternion.z)
    const wx = quaternion.w * (quaternion.x + quaternion.x)
    const wy = quaternion.w * (quaternion.y + quaternion.y)
    const wz = quaternion.w * (quaternion.z + quaternion.z)

    this[0] = (1 - (yy + zz)) * scale.x
    this[1] = (xy + wz) * scale.x
    this[2] = (xz - wy) * scale.x
    this[3] = 0
    this[4] = (xy - wz) * scale.y
    this[5] = (1 - (xx + zz)) * scale.y
    this[6] = (yz + wx) * scale.y
    this[7] = 0
    this[8] = (xz + wy) * scale.z
    this[9] = (yz - wx) * scale.z
    this[10] = (1 - (xx + yy)) * scale.z
    this[11] = 0
    this[12] = position.x
    this[13] = position.y
    this[14] = position.z
    this[15] = 1

    return this
  }

  /**
   * Decomposes this matrix into position, quaternion, and scale properties.
   */
  decompose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
    this.getPosition(position)
    this.getScale(scale)
    this.getQuaternion(quaternion)

    return this
  }

  /**
   * Calculates the inverse of this matrix (no-op with determinant of `0`).
   */
  invert(): this {
    const b00 = this[0] * this[5] - this[1] * this[4]
    const b01 = this[0] * this[6] - this[2] * this[4]
    const b02 = this[0] * this[7] - this[3] * this[4]
    const b03 = this[1] * this[6] - this[2] * this[5]
    const b04 = this[1] * this[7] - this[3] * this[5]
    const b05 = this[2] * this[7] - this[3] * this[6]
    const b06 = this[8] * this[13] - this[9] * this[12]
    const b07 = this[8] * this[14] - this[10] * this[12]
    const b08 = this[8] * this[15] - this[11] * this[12]
    const b09 = this[9] * this[14] - this[10] * this[13]
    const b10 = this[9] * this[15] - this[11] * this[13]
    const b11 = this[10] * this[15] - this[11] * this[14]

    // Make sure we're not dividing by zero
    const det = this.determinant()
    if (!det) return this

    const invDet = 1 / det

    return this.set(
      this[5] * b11 - this[6] * b10 + this[7] * b09,
      this[2] * b10 - this[1] * b11 - this[3] * b09,
      this[13] * b05 - this[14] * b04 + this[15] * b03,
      this[10] * b04 - this[9] * b05 - this[11] * b03,
      this[6] * b08 - this[4] * b11 - this[7] * b07,
      this[0] * b11 - this[2] * b08 + this[3] * b07,
      this[14] * b02 - this[12] * b05 - this[15] * b01,
      this[8] * b05 - this[10] * b02 + this[11] * b01,
      this[4] * b10 - this[5] * b08 + this[7] * b06,
      this[1] * b08 - this[0] * b10 - this[3] * b06,
      this[12] * b04 - this[13] * b02 + this[15] * b00,
      this[9] * b02 - this[8] * b04 - this[11] * b00,
      this[5] * b07 - this[4] * b09 - this[6] * b06,
      this[0] * b09 - this[1] * b07 + this[2] * b06,
      this[13] * b01 - this[12] * b03 - this[14] * b00,
      this[8] * b03 - this[9] * b01 + this[10] * b00,
    ).multiply(invDet)
  }

  /**
   * Calculates a rotation matrix from a `Quaternion`.
   */
  fromQuaternion(q: Quaternion): this {
    return this.compose(_zero, q, _one)
  }
}
