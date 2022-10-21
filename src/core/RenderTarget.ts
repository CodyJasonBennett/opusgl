import { Texture } from './Texture'

/**
 * RenderTarget constructor parameters. Accepts drawing dimensions, attachment and sample size.
 */
export interface RenderTargetOptions {
  /**
   * Drawing buffer width.
   */
  width: number
  /**
   * Drawing buffer height.
   */
  height: number
  /**
   * Number of color attachments to create. Default is `1`.
   */
  count?: number
  /**
   * Number of samples for multi-sampling. Default is `0`.
   */
  samples?: number
  /**
   * Textures to write color attachments to. Default is created with `nearest` filtering.
   */
  textures?: Texture[]
}

/**
 * Constructs a render target to draw into.
 */
export class RenderTarget implements RenderTargetOptions {
  readonly width: number = 0
  readonly height: number = 0
  readonly count: number = 1
  readonly samples: number = 0
  readonly textures: Texture[] = []

  constructor(options: RenderTargetOptions) {
    Object.assign(this, options)

    if (!this.textures?.length) {
      for (let i = 0; i < this.count; i++) {
        const texture = new Texture({
          minFilter: 'nearest',
          magFilter: 'nearest',
          flipY: false,
          generateMipmaps: false,
        })
        this.textures.push(texture)
      }
    }
  }

  /**
   * Disposes render target from GPU memory.
   */
  dispose(): void {
    // Implemented by renderer
  }
}
