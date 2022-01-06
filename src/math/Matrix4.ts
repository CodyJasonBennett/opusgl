import { MathArray } from './MathArray'
import type { Vector3 } from './Vector3'
import type { Quaternion } from './Quaternion'

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
      this[0] = this[0] * t[0] + this[4] * t[1] + this[8] * t[2] + this[12] * t[3]
      this[4] = this[0] * t[4] + this[4] * t[5] + this[8] * t[6] + this[12] * t[7]
      this[8] = this[0] * t[8] + this[4] * t[9] + this[8] * t[10] + this[12] * t[11]
      this[12] = this[0] * t[12] + this[4] * t[13] + this[8] * t[14] + this[12] * t[15]

      this[1] = this[1] * t[0] + this[5] * t[1] + this[9] * t[2] + this[13] * t[3]
      this[5] = this[1] * t[4] + this[5] * t[5] + this[9] * t[6] + this[13] * t[7]
      this[9] = this[1] * t[8] + this[5] * t[9] + this[9] * t[10] + this[13] * t[11]
      this[13] = this[1] * t[12] + this[5] * t[13] + this[9] * t[14] + this[13] * t[15]

      this[2] = this[2] * t[0] + this[6] * t[1] + this[10] * t[2] + this[14] * t[3]
      this[6] = this[2] * t[4] + this[6] * t[5] + this[10] * t[6] + this[14] * t[7]
      this[10] = this[2] * t[8] + this[6] * t[9] + this[10] * t[10] + this[14] * t[11]
      this[14] = this[2] * t[12] + this[6] * t[13] + this[10] * t[14] + this[14] * t[15]

      this[3] = this[3] * t[0] + this[7] * t[1] + this[11] * t[2] + this[15] * t[3]
      this[7] = this[3] * t[4] + this[7] * t[5] + this[11] * t[6] + this[15] * t[7]
      this[11] = this[3] * t[8] + this[7] * t[9] + this[11] * t[10] + this[15] * t[11]
      this[15] = this[3] * t[12] + this[7] * t[13] + this[11] * t[14] + this[15] * t[15]
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

  determinant() {
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

  perspective(fov: number, aspect: number, near: number, far: number) {
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
    this[10] = (far + near) * depth
    this[11] = -1
    this[12] = 0
    this[13] = 0
    this[14] = 2 * far * near * depth
    this[15] = 0

    return this
  }

  orthogonal(left: number, right: number, bottom: number, top: number, near: number, far: number) {
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
    this[10] = 2 * depth
    this[11] = 0
    this[12] = (left + right) * horizontal
    this[13] = (top + bottom) * vertical
    this[14] = (far + near) * depth
    this[15] = 1

    return this
  }

  lookAt(eye: Vector3, target: Vector3, up: Vector3) {
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

  translate(v: Vector3) {
    this[12] += this[0] * v.x + this[4] * v.y + this[8] * v.z
    this[13] += this[1] * v.x + this[5] * v.y + this[9] * v.z
    this[14] += this[2] * v.x + this[6] * v.y + this[10] * v.z
    this[15] += this[3] * v.x + this[7] * v.y + this[11] * v.z

    return this
  }

  scale(v: Vector3) {
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

  rotate(radians: number, axis: Vector3) {
    const length = axis.length()

    if (length < Number.EPSILON) return

    axis.multiply(1 / length)

    const s = Math.sin(radians)
    const c = Math.cos(radians)
    const t = 1 - c

    // Construct the elements of the rotation matrix
    const b00 = axis.x * axis.x * t + c
    const b02 = axis.z * axis.x * t - axis.y * s
    const b01 = axis.y * axis.x * t + axis.z * s
    const b10 = axis.x * axis.y * t - axis.z * s
    const b11 = axis.y * axis.y * t + c
    const b12 = axis.z * axis.y * t + axis.x * s
    const b20 = axis.x * axis.z * t + axis.y * s
    const b21 = axis.y * axis.z * t - axis.x * s
    const b22 = axis.z * axis.z * t + c

    // Perform rotation-specific matrix multiplication
    this.set(
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

    return this
  }

  compose(position: Vector3, quaternion: Quaternion, scale: Vector3) {
    const { x, y, z, w } = quaternion

    const xx = x * (x + x)
    const xy = x * (y + y)
    const xz = x * (z + z)
    const yy = y * (y + y)
    const yz = y * (z + z)
    const zz = z * (z + z)
    const wx = w * (x + x)
    const wy = w * (y + y)
    const wz = w * (z + z)

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

  decompose(position: Vector3, quaternion: Quaternion, scale: Vector3) {
    position.set(this[12], this[13], this[14])

    scale.x = Math.hypot(this[0], this[1], this[2])
    scale.y = Math.hypot(this[4], this[5], this[6])
    scale.z = Math.hypot(this[8], this[9], this[10])

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
      quaternion.w = 0.25 * S
      quaternion.x = (sm23 - sm32) / S
      quaternion.y = (sm31 - sm13) / S
      quaternion.z = (sm12 - sm21) / S
    } else if (sm11 > sm22 && sm11 > sm33) {
      const S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2
      quaternion.w = (sm23 - sm32) / S
      quaternion.x = 0.25 * S
      quaternion.y = (sm12 + sm21) / S
      quaternion.z = (sm31 + sm13) / S
    } else if (sm22 > sm33) {
      const S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2
      quaternion.w = (sm31 - sm13) / S
      quaternion.x = (sm12 + sm21) / S
      quaternion.y = 0.25 * S
      quaternion.z = (sm23 + sm32) / S
    } else {
      const S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2
      quaternion.w = (sm12 - sm21) / S
      quaternion.x = (sm31 + sm13) / S
      quaternion.y = (sm23 + sm32) / S
      quaternion.z = 0.25 * S
    }

    return this
  }
}
