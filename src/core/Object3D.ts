import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'
import { uuid } from '../utils'

export class Object3D {
  readonly isObject3D = true
  readonly uuid: string
  readonly matrix = new Matrix4()
  readonly worldMatrix = new Matrix4()
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
    this.uuid = uuid()
  }

  lookAt(x: Vector3 | number, y?: number, z?: number) {
    if (typeof x === 'number') {
      this.target.set(x, y, z)
    } else {
      this.target.copy(x)
    }

    this.matrix.lookAt(this.position, this.target, this.up)
    this.matrix.decompose(this.position, this.quaternion, this.scale)
  }

  updateMatrixWorld() {
    if (!this.matrixAutoUpdate) return

    this.quaternion.fromEuler(this.rotation)
    this.matrix.compose(this.position, this.quaternion, this.scale)

    this.worldMatrix.copy(this.matrix)
    if (this.parent) this.worldMatrix.multiply(this.parent.worldMatrix)
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
