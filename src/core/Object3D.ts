import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'

/**
 * Represents an Object3D traversal callback.
 */
export type TraverseCallback = (object: Object3D) => boolean | void

/**
 * Constructs a 3D object. Useful for calculating transform matrices.
 */
export class Object3D {
  /**
   * Combined transforms of the object in world space.
   */
  readonly matrix = new Matrix4()
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
   * Local rotation for this object and its descendants. Default is `0, 0, 0`, ordered as `ZYX`.
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

  private _v = new Vector3()
  private _m = new Matrix4()

  private get _prefersEulers(): boolean {
    return this.rotation.getLength() !== 0
  }

  /**
   * Rotates to face a point in world space.
   */
  lookAt(x: Vector3 | number, y?: number, z?: number): void {
    if (typeof x === 'number') {
      this._v.set(x, y, z)
    } else {
      this._v.copy(x)
    }

    this._m.lookAt(this.position, this._v, this.up)
    this._m.getQuaternion(this.quaternion)

    if (this._prefersEulers) {
      this.rotation.fromQuaternion(this.quaternion)
      this.quaternion.identity()
    }
  }

  /**
   * Used internally to calculate global transforms.
   */
  updateMatrix(updateChildren = true, updateParents = false): void {
    if (this.matrixAutoUpdate) {
      if (this._prefersEulers) this.quaternion.fromEuler(this.rotation)
      this.matrix.compose(this.position, this.quaternion, this.scale)
      if (this._prefersEulers) this.quaternion.identity()
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
  add(...children: Object3D[]): void {
    for (const child of children) {
      this.children.push(child)
      child.parent = this
    }
  }

  /**
   * Removes objects as children.
   */
  remove(...children: Object3D[]): void {
    for (const child of children) {
      const childIndex = this.children.indexOf(child)
      if (childIndex !== -1) this.children.splice(childIndex, 1)
      child.parent = null
    }
  }

  /**
   * Traverses through children and executes a callback. Return `true` to stop traversing.
   */
  traverse(callback: TraverseCallback): void {
    const shouldStop = callback(this)
    if (shouldStop) return

    for (const child of this.children) child.traverse(callback)
  }
}
