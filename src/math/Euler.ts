export type EulerOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX'

export class Euler {
  readonly isEuler = true
  public x: number
  public y: number
  public z: number
  public order: EulerOrder;

  *[Symbol.iterator]() {
    yield this.x
    yield this.y
    yield this.z
    yield this.order
  }

  constructor(x = 0, y = 0, z = 0, order: EulerOrder = 'YXZ') {
    this.set(x, y, z)
    this.order = order
  }

  set(x: number, y: number = x, z: number = x) {
    this.x = x
    this.y = y
    this.z = z

    return this
  }

  copy(e: Euler) {
    this.x = e.x
    this.y = e.y
    this.z = e.z

    return this
  }

  clone() {
    return new Euler(this.x, this.y, this.z, this.order)
  }
}
