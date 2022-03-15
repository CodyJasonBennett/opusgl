import type { ProgramOptions, Uniform } from './Program'
import type { GL_CULL_SIDES } from '../constants'
import { uuid } from '../utils'

/**
 * Material constructor parameters. Accepts shaders, their uniforms, and various blending & culling options.
 */
export interface MaterialOptions extends Omit<ProgramOptions, 'attributes' | 'compute'> {}

/**
 * Constructs a material object. Used to store program shaders and uniforms.
 */
export class Material implements MaterialOptions {
  readonly isMaterial = true
  readonly uuid: string
  readonly uniforms: { [name: string]: Uniform } = {}
  public vertex!: string
  public fragment!: string
  public side: keyof typeof GL_CULL_SIDES = 'front'
  public transparent = false
  public depthTest = true
  public depthWrite = true

  constructor(options?: MaterialOptions) {
    this.uuid = uuid()

    if (options) Object.assign(this, options)
  }

  /**
   * Disposes material from GPU memory.
   */
  dispose() {
    // Implemented by renderer
  }
}
