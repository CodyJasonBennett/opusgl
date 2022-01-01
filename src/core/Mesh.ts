import { Object3D } from './Object3D'
import type { Geometry } from './Geometry'
import type { Material } from './Material'
import { DRAW_MODES } from '../constants'

export type MeshDrawMode = typeof DRAW_MODES[keyof typeof DRAW_MODES]

export class Mesh extends Object3D {
  readonly isMesh = true
  public geometry: Geometry
  public material: Material
  public mode: MeshDrawMode = DRAW_MODES.TRIANGLES
  public visible = true

  constructor(geometry: Geometry, material: Material) {
    super()

    this.geometry = geometry
    this.material = material
  }
}
