import { Object3D } from './Object3D'
import { Matrix3 } from '../math/Matrix3'
import { Matrix4 } from '../math/Matrix4'
import type { Geometry } from './Geometry'
import type { Material } from './Material'

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
   * The number of instances to render of this mesh.
   */
  public instances = 1

  constructor(geometry?: Geometry, material?: Material) {
    super()

    if (geometry) this.geometry = geometry
    if (material) this.material = material
  }
}
