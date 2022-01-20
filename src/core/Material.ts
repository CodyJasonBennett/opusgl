import { uuid, dispose } from '../utils'
import { GL_CULL_SIDES } from '../constants'

/**
 * Material constructor parameters. Accepts shaders, their uniforms, and various blend & culling options.
 */
export interface MaterialOptions {
  /**
   * Stringified vertex shader code.
   */
  vertex: string
  /**
   * Stringified fragment shader code
   */
  fragment: string
  /**
   * An object of program uniforms. Can accept numbers or built-in math classes.
   */
  uniforms?: { [name: string]: any }
  /**
   * Which sides of faces should be rendered. Default is `front`.
   */
  side?: keyof typeof GL_CULL_SIDES
  /**
   * Whether the material should support transparent rendering. Default is `false`.
   */
  transparent?: boolean
  /**
   * Whether the material should be affected by depth or distance from view. Default is `true`.
   */
  depthTest?: boolean
  /**
   * Whether the material should contribute to world depth and occlude objects. Default is `true`.
   */
  depthWrite?: boolean
}

/**
 * Constructs a material object. Used to store program shaders and uniforms.
 */
export class Material implements MaterialOptions {
  readonly isMaterial = true
  readonly uuid: string
  public vertex!: string
  public fragment!: string
  readonly uniforms: { [name: string]: any } = {}
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
    dispose(this.uuid)
  }
}
