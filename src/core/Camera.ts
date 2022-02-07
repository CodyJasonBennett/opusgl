import { Object3D } from './Object3D'
import { Matrix4 } from '../math/Matrix4'

/**
 * Constructs a camera object. Can be extended to calculate projection matrices.
 */
export abstract class Camera extends Object3D {
  readonly isCamera = true
  /**
   * A projection matrix. Useful for projecting transforms.
   */
  readonly projectionMatrix = new Matrix4()
  /**
   * A world inverse matrix. Useful for aligning transforms with the camera.
   */
  readonly viewMatrix = new Matrix4()

  updateMatrix() {
    super.updateMatrix()

    this.viewMatrix.copy(this.worldMatrix).invert()
  }

  /**
   * Used internally to calculate a projection matrix.
   */
  abstract updateProjectionMatrix(): void
}
