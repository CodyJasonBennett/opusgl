import { Camera } from '../core/Camera'

export class OrthographicCamera extends Camera {
  private _near: number
  private _far: number
  private _left: number
  private _right: number
  private _bottom: number
  private _top: number

  constructor(near = 0.1, far = 1000, left = -1, right = 1, bottom = -1, top = 1) {
    super()

    this._near = near
    this._far = far
    this._left = left
    this._right = right
    this._bottom = bottom
    this._top = top

    this.updateProjectionMatrix()
  }

  get near() {
    return this._near
  }

  get far() {
    return this._far
  }

  get left() {
    return this._left
  }

  get right() {
    return this._right
  }

  get bottom() {
    return this._bottom
  }

  get top() {
    return this._top
  }

  set near(near) {
    this._near = near
    this.needsUpdate = true
  }

  set far(far) {
    this._far = far
    this.needsUpdate = true
  }

  set left(left) {
    this._left = left
    this.needsUpdate = true
  }

  set right(right) {
    this._right = right
    this.needsUpdate = true
  }

  set bottom(bottom) {
    this._bottom = bottom
    this.needsUpdate = true
  }

  set top(top) {
    this._top = top
    this.needsUpdate = true
  }

  updateProjectionMatrix() {
    if (!this.needsUpdate) return

    this.needsUpdate = false
    this.projectionMatrix.orthogonal(this.left, this.right, this.bottom, this.top, this.near, this.far)
  }
}
