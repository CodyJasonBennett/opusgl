import { Object3D } from './Object3D'
import { Matrix4 } from '../math/Matrix4'

export abstract class Camera extends Object3D {
  readonly isCamera = true
  readonly projectionMatrix = new Matrix4()

  abstract updateProjectionMatrix(): void
}
