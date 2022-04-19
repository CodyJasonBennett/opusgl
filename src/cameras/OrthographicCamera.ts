import { Camera } from '../core/Camera'

export class OrthographicCamera extends Camera {
  public near: number
  public far: number
  public left: number
  public right: number
  public bottom: number
  public top: number

  constructor(near = 0.1, far = 1000, left = -1, right = 1, bottom = -1, top = 1) {
    super()

    this.near = near
    this.far = far
    this.left = left
    this.right = right
    this.bottom = bottom
    this.top = top

    this.updateProjectionMatrix()
  }

  updateProjectionMatrix() {
    this.projectionMatrix.orthogonal(this.left, this.right, this.bottom, this.top, this.near, this.far)
    this.frustum.update()
  }
}
