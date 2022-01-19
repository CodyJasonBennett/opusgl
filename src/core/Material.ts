import { uuid, dispose } from '../utils'
import { GL_CULL_SIDES } from '../constants'

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
  readonly uuid: string
  public vertex!: string
  public fragment!: string
  readonly uniforms: { [name: string]: any } = {}
  public side: keyof typeof GL_CULL_SIDES = 'back'
  public transparent = false
  public depthTest = true
  public depthWrite = true

  constructor(options?: MaterialOptions) {
    this.uuid = uuid()

    if (options) Object.assign(this, options)
  }

  dispose() {
    dispose(this.uuid)
  }
}
