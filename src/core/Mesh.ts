import { Object3D } from './Object3D'
import { Matrix4 } from '../math/Matrix4'
import { Matrix3 } from '../math/Matrix3'
import type { Geometry } from './Geometry'
import type { Material } from './Material'
import type { Camera } from './Camera'
import { dispose } from '../utils'
import { GL_DRAW_MODES } from '../constants'

export class Mesh extends Object3D {
  readonly isMesh = true
  public geometry: Geometry
  public material: Material
  readonly normalMatrix = new Matrix3()
  readonly modelViewMatrix = new Matrix4()
  public mode: keyof typeof GL_DRAW_MODES = 'triangles'

  constructor(geometry: Geometry, material: Material) {
    super()

    this.geometry = geometry
    this.material = material
  }

  updateMatrix(camera?: Camera) {
    super.updateMatrix()

    if (camera) {
      this.modelViewMatrix.copy(camera.viewMatrix).multiply(this.worldMatrix)
      this.normalMatrix.getNormalMatrix(this.modelViewMatrix)
    }
  }

  /**
   * Disposes mesh from GPU memory.
   */
  dispose() {
    dispose(this.uuid)
  }
}
