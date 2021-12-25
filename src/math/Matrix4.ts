export class Matrix4 {
  readonly isMatrix4 = true
  public elements: number[];

  *[Symbol.iterator]() {
    yield this.elements[0]
    yield this.elements[1]
    yield this.elements[2]
    yield this.elements[3]

    yield this.elements[4]
    yield this.elements[5]
    yield this.elements[6]
    yield this.elements[7]

    yield this.elements[8]
    yield this.elements[9]
    yield this.elements[10]
    yield this.elements[11]

    yield this.elements[12]
    yield this.elements[13]
    yield this.elements[14]
    yield this.elements[15]
  }

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
    this.elements = []
    return this.set(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
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
    this.elements[0] = m00
    this.elements[1] = m01
    this.elements[2] = m02
    this.elements[3] = m03

    this.elements[4] = m10
    this.elements[5] = m11
    this.elements[6] = m12
    this.elements[7] = m13

    this.elements[8] = m20
    this.elements[9] = m21
    this.elements[10] = m22
    this.elements[11] = m23

    this.elements[12] = m30
    this.elements[13] = m31
    this.elements[14] = m32
    this.elements[15] = m33

    return this
  }

  copy(m: Matrix4) {
    this.elements = m.elements

    return this
  }

  clone() {
    return new Matrix4(...this.elements)
  }
}
