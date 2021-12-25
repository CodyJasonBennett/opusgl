export class Matrix3 {
  readonly isMatrix3 = true
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
  }

  constructor(m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0, m20 = 0, m21 = 0, m22 = 1) {
    this.elements = []
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
    this.elements[0] = m00
    this.elements[1] = m01
    this.elements[2] = m02

    this.elements[3] = m10
    this.elements[4] = m11
    this.elements[5] = m12

    this.elements[6] = m20
    this.elements[7] = m21
    this.elements[8] = m22

    return this
  }

  copy(m: Matrix3) {
    this.elements = m.elements

    return this
  }

  clone() {
    return new Matrix3(...this.elements)
  }
}
