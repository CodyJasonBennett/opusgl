import { Matrix4 } from '../math/Matrix4'
import { Matrix3 } from '../math/Matrix3'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'

let id = 0

export class Object3D {
  readonly isObject3D = true
  readonly id: number
  readonly matrix = new Matrix4()
  readonly normalMatrix = new Matrix3()
  readonly inverseMatrix = new Matrix4()
  readonly position = new Vector3()
  readonly target = new Vector3()
  readonly up = new Vector3(0, 1, 0)
  readonly scale = new Vector3(1)
  readonly rotation = new Euler()
  readonly quaternion = new Quaternion()
  readonly children: Object3D[] = []
  public matrixAutoUpdate = true
  public parent?: Object3D
  public name?: string

  constructor() {
    this.id = id++
  }

  lookAt(x: Vector3 | number, y?: number, z?: number) {
    if (typeof x === 'number') {
      this.target.set(x, y, z)
    } else {
      this.target.copy(x)
    }
  }

  updateMatrixWorld() {
    if (!this.matrixAutoUpdate) return

    this.inverseMatrix.identity()
    this.matrix.identity()
    this.quaternion.identity()

    this.inverseMatrix.lookAt(this.position, this.target, this.up)

    if (this.parent) {
      this.matrix.multiply(this.parent.matrix)
    }

    this.quaternion.fromEuler(this.rotation)
    this.matrix.compose(this.position, this.quaternion, this.scale)

    this.normalMatrix.getNormalMatrix(this.matrix)
  }

  add(child: Object3D) {
    this.children.push(child)
    child.parent = this
  }

  remove(child: Object3D) {
    const childIndex = this.children.indexOf(child)
    if (childIndex !== -1) this.children.splice(childIndex, 1)
    delete child.parent
  }
}
