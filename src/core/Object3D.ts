import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'
import { uuid } from '../utils'

const _q = new Quaternion()

/**
 * Represents an Object3D traversal callback.
 */
export type TraverseCallback = (object: Object3D) => boolean | void

/**
 * Constructs a 3D object. Useful for calculating transform matrices.
 */
export class Object3D {
  readonly uuid: string
  /**
   * Combined transforms of the object in world space.
   */
  readonly matrix = new Matrix4()
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
   * Local quaternion for this object and its descendants. Default is `0, 0, 0, 1`.
   */
  readonly quaternion = new Quaternion()
  /**
   * Whether to automatically update transform matrices for this object and its descendants. Default is `true`.
   */
  public autoUpdate = true
  /**
   * Whether to automatically update local transform from position/rotation/scale properties. Default is `true`.
   */
  public matrixAutoUpdate = true
  /**
   * An array of child objects in the scene graph.
   */
  readonly children: Object3D[] = []
  /**
   * The current parent in the scene graph.
   */
  public parent: Object3D | null = null
  /**
   * Whether object should be rendered. Default is `true`.
   */
  public visible = true
  /**
   * Whether to cull from rendering when out of view of a camera, if able. Default is `true`.
   */
  public frustumCulled = true
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
      this.target.set(x, y ?? x, z ?? x)
    } else {
      this.target.copy(x)
    }

    this.matrix.lookAt(this.position, this.target, this.up)
    this.matrix.decompose(this.position, this.quaternion, this.scale)
  }

  /**
   * Used internally to calculate global transforms.
   */
  updateMatrix(updateChildren = true, updateParents = false) {
    if (this.matrixAutoUpdate) {
      _q.copy(this.quaternion).applyEuler(this.rotation)
      this.matrix.compose(this.position, _q, this.scale)
    }

    if (this.parent) {
      if (updateParents) this.parent.updateMatrix(false, true)
      this.matrix.multiply(this.parent.matrix)
    }

    if (updateChildren) {
      for (const child of this.children) {
        if (child.autoUpdate) child.updateMatrix()
      }
    }
  }

  /**
   * Adds objects as a children.
   */
  add(...children: Object3D[]) {
    for (const child of children) {
      this.children.push(child)
      child.parent = this
    }
  }

  /**
   * Removes objects as children.
   */
  remove(...children: Object3D[]) {
    for (const child of children) {
      const childIndex = this.children.indexOf(child)
      if (childIndex !== -1) this.children.splice(childIndex, 1)
      child.parent = null
    }
  }

  /**
   * Traverses through children and executes a callback. Return `true` to stop traversing.
   */
  traverse(callback: TraverseCallback) {
    const shouldStop = callback(this)
    if (shouldStop) return

    for (const child of this.children) child.traverse(callback)
  }
}
