import type { Color } from '../math/Color'
import type { Matrix3 } from '../math/Matrix3'
import type { Matrix4 } from '../math/Matrix4'
import type { Quaternion } from '../math/Quaternion'
import type { Vector2 } from '../math/Vector2'
import type { Vector3 } from '../math/Vector3'
import type { Vector4 } from '../math/Vector4'
import type { Texture } from './Texture'

/**
 * Represents a program uniform.
 */
export type Uniform = number | number[] | Color | Matrix3 | Matrix4 | Quaternion | Vector2 | Vector3 | Vector4 | Texture

/**
 * Represents a list of uniforms.
 */
export interface UniformList {
  [name: string]: Uniform
}

/**
 * The blend operation to use when applying blending.
 */
export type BlendOperation = 'add' | 'subtract' | 'reverse-subtract' | 'min' | 'max'

/**
 * The blend factor to be used when applying blending.
 */
export type BlendFactor =
  | 'zero'
  | 'one'
  | 'src'
  | 'one-minus-src'
  | 'src-alpha'
  | 'one-minus-src-alpha'
  | 'dst'
  | 'one-minus-dst'
  | 'dst-alpha'
  | 'one-minus-dst-alpha'
  | 'src-alpha-saturated'
  | 'constant'
  | 'one-minus-constant'

/**
 * Describes blending between a material and a color buffer's components.
 */
export interface BlendComponent {
  /**
   * The blend operation to use when applying blending.
   */
  operation?: BlendOperation
  /**
   * The blend factor to be used on values from the fragment shader.
   */
  srcFactor?: BlendFactor
  /**
   * The blend factor to be used on values to a color buffer.
   */
  dstFactor?: BlendFactor
}

/**
 * How a material should blend into a color buffer and its components.
 */
export interface Blending {
  color: BlendComponent
  alpha: BlendComponent
}

/**
 * Which sides of faces should be rendered.
 */
export type CullSide = 'front' | 'back' | 'both'

/**
 * Which primitive mode to render with.
 */
export type DrawMode = 'points' | 'lines' | 'triangles'

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
  side?: CullSide
  /**
   * Which primitive mode to render with. Default is `triangles`.
   */
  mode?: DrawMode
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
  /**
   * How the material should blend into a color buffer and its components.
   */
  blending?: Blending
}

/**
 * Constructs a material object. Used to store program shaders and uniforms.
 */
export class Material implements MaterialOptions {
  readonly uniforms: { [name: string]: Uniform } = {}
  public vertex!: string
  public fragment!: string
  public side: CullSide = 'front'
  public mode: DrawMode = 'triangles'
  public transparent = false
  public depthTest = true
  public depthWrite = true
  public blending?: Blending

  constructor(options?: MaterialOptions) {
    if (options) {
      if (options.transparent) {
        this.blending = {
          color: {
            operation: 'add',
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
          },
          alpha: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
          },
        }
        this.depthWrite = false
      }

      Object.assign(this, options)
    }
  }

  /**
   * Disposes material from GPU memory.
   */
  dispose(): void {
    // Implemented by renderer
  }
}
