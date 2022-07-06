import { Object3D } from './Object3D'
import { Matrix3 } from '../math/Matrix3'
import { Matrix4 } from '../math/Matrix4'
import type { Geometry } from './Geometry'
import type { Material } from './Material'

export type DrawMode = 'points' | 'lines' | 'triangles'

/**
 * Constructs a mesh object. Describes an object with geometry and material.
 */
export class Mesh extends Object3D {
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
  public mode: DrawMode = 'triangles'

  constructor(geometry?: Geometry, material?: Material) {
    super()

    if (geometry) this.geometry = geometry
    if (material) this.material = material
  }

  /**
   * Disposes mesh from GPU memory.
   */
  dispose(): void {
    // Implemented by renderer
  }
}
