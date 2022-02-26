import { Object3D } from './Object3D'
import { Matrix3 } from '../math/Matrix3'
import { Matrix4 } from '../math/Matrix4'
import type { Geometry } from './Geometry'
import type { Material } from './Material'
import type { GL_DRAW_MODES } from '../constants'

/**
 * Constructs a mesh object. Describes an object with geometry and material.
 */
export class Mesh extends Object3D {
  readonly isMesh = true
  /**
   * Normalized directional transforms. Useful for physics or lighting.
   */
  readonly normalMatrix = new Matrix3()
  /**
   * World space transforms relative to the active camera.
   */
  readonly modelViewMatrix = new Matrix4()
  /**
   * A `Geometry` object describing the mesh's volume.
   */
  public geometry!: Geometry
  /**
   * A `Material` object describing the mesh's visual behavior.
   */
  public material!: Material
  /**
   * Which primitive mode to render with. Default is `triangles`.
   */
  public mode: keyof typeof GL_DRAW_MODES = 'triangles'

  constructor(geometry?: Geometry, material?: Material) {
    super()

    if (geometry) this.geometry = geometry
    if (material) this.material = material
  }

  /**
   * Disposes mesh from GPU memory.
   */
  dispose() {
    // Implemented by renderer
  }
}
