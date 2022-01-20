import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'
import { uuid } from '../utils'

/**
 * Constructs a 3D object. Useful for calculating transform matrices.
 */
export class Object3D {
  readonly isObject3D = true
  readonly uuid: string
  /**
   * Combined transforms of the object in local space.
   */
  readonly matrix = new Matrix4()
  /**
   * Combined transforms of the object in world space.
   */
  readonly worldMatrix = new Matrix4()
  /**
   * Used to store the object's orientation when using the `lookAt` method.
   */
  readonly target = new Vector3()
  /**
   * Used to orient the object when using the `lookAt` method. Default is `0, 1, 0`.
   */
  readonly up = new Vector3(0, 1, 0)
  /**
   * Local position for this object and its descendants. Default is `0, 0, 0`.
   */
  readonly position = new Vector3()
  /**
   * Local scale for this object and its descendants. Default is `1, 1, 1`.
   */
  readonly scale = new Vector3(1)
  /**
   * Local rotation for this object and its descendants. Default is `0, 0, 0`, ordered as `YXZ`.
   */
  readonly rotation = new Euler()
  /**
   * Local rotation for this object and its descendants.
   */
  readonly quaternion = new Quaternion()
  /**
   * Whether to automatically update transform matrices.
   */
  public matrixAutoUpdate = true
  /**
   * An array of child objects in the scene graph.
   */
  readonly children: Object3D[] = []
  /**
   * The current parent in the scene graph.
   */
  public parent?: Object3D
  /**
   * Whether object should be rendered. Default is `true`.
   */
  public visible = true
  /**
   * An optional named identifier. Default is an empty string.
   */
  public name = ''

  constructor() {
    this.uuid = uuid()
  }

  /**
   * Rotates to face a point in world space.
   */
  lookAt(x: Vector3 | number, y?: number, z?: number) {
    if (typeof x === 'number') {
      this.target.set(x, y, z)
    } else {
      this.target.copy(x)
    }

    this.matrix.lookAt(this.position, this.target, this.up)
    this.matrix.decompose(this.position, this.quaternion, this.scale)
  }

  /**
   * Used internally to calculate global transforms.
   */
  updateMatrix() {
    if (!this.matrixAutoUpdate) return

    this.quaternion.fromEuler(this.rotation)
    this.matrix.compose(this.position, this.quaternion, this.scale)

    this.worldMatrix.copy(this.matrix)
    if (this.parent) this.worldMatrix.multiply(this.parent.worldMatrix)
  }

  /**
   * Adds objects as a children.
   */
  add(...children: Object3D[]) {
    children.forEach((child) => {
      this.children.push(child)
      child.parent = this
    })
  }

  /**
   * Removes objects as children.
   */
  remove(...children: Object3D[]) {
    children.forEach((child) => {
      const childIndex = this.children.indexOf(child)
      if (childIndex !== -1) this.children.splice(childIndex, 1)
      delete child.parent
    })
  }

  /**
   * Traverses through scene children and executes a callback. Return `true` to stop traversing.
   */
  traverse(callback: (object: Object3D) => any) {
    const shouldStop = !!callback(this)
    if (shouldStop) return

    this.children.forEach((child) => child.traverse(callback))
  }
}
