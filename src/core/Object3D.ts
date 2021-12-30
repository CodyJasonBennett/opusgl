import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'

let id = 0

export class Object3D {
  readonly isObject3D = true
  readonly id: number
  readonly matrix = new Matrix4()
  readonly position = new Vector3()
  readonly scale = new Vector3(1)
  readonly rotation = new Euler()
  readonly quaternion = new Quaternion()
  readonly children: Object3D[] = []
  public matrixAutoUpdate = true
  public parent?: Object3D = null
  public name?: string

  constructor() {
    this.id = id++
  }

  add(child: Object3D) {
    this.children.push(child)
    child.parent = this
  }

  remove(child: Object3D) {
    const childIndex = this.children.indexOf(child)
    if (childIndex !== -1) this.children.splice(childIndex, 1)
    child.parent = null
  }
}
