import { Object3D } from './Object3D'
import { Matrix4 } from '../math/Matrix4'
import { Matrix3 } from '../math/Matrix3'
import type { Geometry } from './Geometry'
import type { Material } from './Material'
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

  /**
   * Disposes mesh from GPU memory.
   */
  dispose() {
    // Implemented by renderer
  }
}
