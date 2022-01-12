import { Matrix4 } from '../math/Matrix4'
import { Matrix3 } from '../math/Matrix3'
import { GL_CULL_SIDES } from '../constants'

let id = 0

export interface MaterialOptions {
  vertex: string
  fragment: string
  uniforms?: { [name: string]: any }
  side?: keyof typeof GL_CULL_SIDES
  transparent?: boolean
  depthTest?: boolean
  depthWrite?: boolean
}

export class Material implements MaterialOptions {
  readonly isMaterial = true
  readonly id: number
  public vertex!: string
  public fragment!: string
  readonly uniforms: { [name: string]: any } = {
    modelMatrix: new Matrix4(),
    normalMatrix: new Matrix3(),
    projectionMatrix: new Matrix4(),
  }
  public side: keyof typeof GL_CULL_SIDES = 'back'
  public transparent = false
  public depthTest = true
  public depthWrite = true

  constructor(options?: MaterialOptions) {
    this.id = id++

    if (options) {
      const uniforms = Object.assign(this.uniforms, options.uniforms ?? {})
      Object.assign(this, { ...options, uniforms })
    }
  }
}
