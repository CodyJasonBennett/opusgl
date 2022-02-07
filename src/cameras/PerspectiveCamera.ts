import { Camera } from '../core/Camera'

export class PerspectiveCamera extends Camera {
  public near: number
  public far: number
  public fov: number
  public aspect: number

  constructor(fov = 75, aspect = 0, near = 0.1, far = 1000) {
    super()

    this.fov = fov
    this.aspect = aspect
    this.near = near
    this.far = far
  }

  updateProjectionMatrix() {
    this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far)
  }
}
