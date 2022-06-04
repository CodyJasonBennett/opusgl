import type { Color } from '../math/Color'
import type { Euler } from '../math/Euler'
import type { Matrix3 } from '../math/Matrix3'
import type { Matrix4 } from '../math/Matrix4'
import type { Quaternion } from '../math/Quaternion'
import type { Vector2 } from '../math/Vector2'
import type { Vector3 } from '../math/Vector3'
import type { Vector4 } from '../math/Vector4'
import type { Texture } from './Texture'
import type { GL_DRAW_MODES, GL_CULL_SIDES } from '../constants'
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
 * Represents a program attribute.
 */
export interface Attribute {
  /**
   * Attribute data.
   */
  data: Float32Array | Uint32Array
  /**
   * The size (per vertex) of the data array. Used to allocate data to each vertex.
   */
  size: 1 | 2 | 3 | 4
  /**
   * Used internally to mark attribute for updates.
   */
  needsUpdate?: boolean
}

export interface AttributeList {
  [name: string]: Attribute
}

/**
 * Program constructor parameters. Accepts shaders, their attributes & uniforms, and various blending & culling options.
 */
export interface ProgramOptions {
  /**
   * User-defined program uniforms.
   */
  uniforms?: UniformList
  /**
   * User-defined program attributes.
   */
  attributes?: AttributeList
  /**
   * Stringified vertex shader code. Must be specified alongside `fragment`.
   */
  vertex?: string
  /**
   * Stringified fragment shader code. Must be specified alongside `vertex`.
   */
  fragment?: string
  /**
   * Stringified compute shader code.
   */
  compute?: string
  /**
   * Which primitive mode to render with. Default is `triangles`.
   */
  mode?: keyof typeof GL_DRAW_MODES
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
 * Constructs a GPU graphics or compute program.
 */
export class Program implements ProgramOptions {
  readonly isProgram = true
  readonly uuid: string
  readonly attributes: { [name: string]: Attribute } = {}
  readonly uniforms: { [name: string]: Uniform } = {}
  public vertex!: string
  public fragment!: string
  public compute!: string
  public mode: keyof typeof GL_DRAW_MODES = 'triangles'
  public side: keyof typeof GL_CULL_SIDES = 'front'
  public transparent = false
  public depthTest = true
  public depthWrite = true

  constructor(options?: ProgramOptions) {
    this.uuid = uuid()

    if (options) Object.assign(this, options)
  }

  /**
   * Disposes program from GPU memory.
   */
  dispose() {
    // Implemented by renderer
  }
}
