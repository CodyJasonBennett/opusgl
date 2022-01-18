import { Object3D } from './Object3D'
import { Matrix4 } from '../math/Matrix4'

export abstract class Camera extends Object3D {
  readonly isCamera = true
  readonly projectionMatrix = new Matrix4()
  readonly viewMatrix = new Matrix4()
  public needsUpdate = true

  updateMatrixWorld() {
    super.updateMatrixWorld()

    this.viewMatrix.copy(this.modelMatrix).invert()
  }

  abstract updateProjectionMatrix(): void
}
