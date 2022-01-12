import { Object3D } from './Object3D'
import type { Geometry } from './Geometry'
import type { Material } from './Material'
import { GL_DRAW_MODES } from '../constants'

export class Mesh extends Object3D {
  readonly isMesh = true
  public geometry: Geometry
  public material: Material
  public mode: keyof typeof GL_DRAW_MODES = 'triangles'
  public visible = true

  constructor(geometry: Geometry, material: Material) {
    super()

    this.geometry = geometry
    this.material = material
  }
}
