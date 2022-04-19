import { Texture } from './Texture'
import { uuid } from '../utils'

export class RenderTarget {
  readonly uuid: string
  readonly width: number
  readonly height: number
  readonly count: number
  readonly samples: number
  readonly textures: Texture[] = []
  readonly isRenderTarget = true

  constructor(width: number, height: number, count = 1, samples = 0) {
    this.uuid = uuid()
    this.width = width
    this.height = height
    this.count = count
    this.samples = samples

    for (let i = 0; i < count; i++) {
      const texture = new Texture({ minFilter: 'nearest', magFilter: 'nearest', flipY: false, generateMipmaps: false })
      this.textures.push(texture)
    }
  }

  /**
   * Disposes render target from GPU memory.
   */
  dispose() {
    // Implemented by renderer
  }
}
