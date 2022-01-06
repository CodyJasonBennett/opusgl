import { Matrix4 } from '../math/Matrix4'
import { Matrix3 } from '../math/Matrix3'
import { CULL_SIDES } from '../constants'

let id = 0

export interface MaterialOptions {
  vertex: string
  fragment: string
  uniforms?: { [name: string]: any }
}

export class Material {
  readonly isMaterial = true
  readonly id: number
  readonly vertex: string
  readonly fragment: string
  readonly uniforms: { [name: string]: any } = {
    modelMatrix: new Matrix4(),
    normalMatrix: new Matrix3(),
    projectionMatrix: new Matrix4(),
  }
  public side: keyof typeof CULL_SIDES = 'BACK'

  constructor(options?: MaterialOptions) {
    this.id = id++

    if (options) {
      this.vertex = options.vertex
      this.fragment = options.fragment
      if (options.uniforms) Object.assign(this.uniforms, options.uniforms)
    }
  }
}
