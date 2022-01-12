import { Camera } from '../core/Camera'

export class PerspectiveCamera extends Camera {
  private _near: number
  private _far: number
  private _fov: number
  private _aspect: number

  constructor(fov = 75, aspect = 0, near = 0.1, far = 1000) {
    super()

    this._fov = fov
    this._aspect = aspect
    this._near = near
    this._far = far
  }

  get near() {
    return this._near
  }

  get far() {
    return this._far
  }

  get fov() {
    return this._fov
  }

  get aspect() {
    return this._aspect
  }

  set near(near) {
    this._near = near
    this.needsUpdate = true
  }

  set far(far) {
    this._far = far
    this.needsUpdate = true
  }

  set fov(fov) {
    this._fov = fov
    this.needsUpdate = true
  }

  set aspect(aspect) {
    this._aspect = aspect
    this.needsUpdate = true
  }

  updateProjectionMatrix() {
    this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far)
  }
}
