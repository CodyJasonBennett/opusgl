import type { Color } from '../math/Color'
import type { Euler } from '../math/Euler'
import type { Matrix3 } from '../math/Matrix3'
import type { Matrix4 } from '../math/Matrix4'
import type { Quaternion } from '../math/Quaternion'
import type { Vector2 } from '../math/Vector2'
import type { Vector3 } from '../math/Vector3'
import type { Vector4 } from '../math/Vector4'
import type { Texture } from './Texture'
import type { GL_CULL_SIDES } from '../constants'
import { uuid } from '../utils'

/**
 * Represents a program uniform.
 */
export type Uniform =
  | number
  | number[]
  | Color
  | Euler
  | Matrix3
  | Matrix4
  | Quaternion
  | Vector2
  | Vector3
  | Vector4
  | Texture

export interface UniformList {
  [name: string]: Uniform
}

/**
 * Material constructor parameters. Accepts shaders, their uniforms, and various blending & culling options.
 */
export interface MaterialOptions {
  /**
   * User-defined program uniforms.
   */
  uniforms?: UniformList
  /**
   * Stringified vertex shader code.
   */
  vertex: string
  /**
   * Stringified fragment shader code.
   */
  fragment: string
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
