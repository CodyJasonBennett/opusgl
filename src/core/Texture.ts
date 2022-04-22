import type { GL_TEXTURE_FILTERS, GL_TEXTURE_WRAPPINGS } from '../constants'
import { uuid } from '../utils'

export type ImageRepresentation = ImageBitmap | HTMLCanvasElement

/**
 * Texture constructor parameters. Accepts an image source and various filtering options.
 */
export interface TextureOptions {
  /**
   * An image source to set this texture to.
   */
  image?: ImageRepresentation
  /**
   * How to sample when a texel is more than 1 pixel. Default is `nearest`.
   */
  magFilter: keyof typeof GL_TEXTURE_FILTERS
  /**
   * How to sample when a texel is less than 1 pixel. Default is `nearest`.
   */
  minFilter: keyof typeof GL_TEXTURE_FILTERS
  /**
   * Horizontal UV wrapping. Default is `clamp`.
   */
  wrapS: keyof typeof GL_TEXTURE_WRAPPINGS
  /**
   * Vertical UV wrapping. Default is `clamp`.
   */
  wrapT: keyof typeof GL_TEXTURE_WRAPPINGS
  /**
   * Whether to generate mipmaps for increased perceived quality. Default is `true`.
   */
  generateMipmaps?: boolean
  /**
   * Vertically flips the texture when uploading to the GPU. Default is `true`.
   */
  flipY?: boolean
  /**
   * Number of samples for anisotropic filtering. Eliminates aliasing at oblique angles. Default is `1`.
   */
  anisotropy?: number
}

/**
 * Constructs a texture. Useful for displaying and storing image data.
 */
export class Texture implements TextureOptions {
  readonly uuid: string
  public image?: ImageRepresentation
  public magFilter: keyof typeof GL_TEXTURE_FILTERS = 'nearest'
  public minFilter: keyof typeof GL_TEXTURE_FILTERS = 'nearest'
  public wrapS: keyof typeof GL_TEXTURE_WRAPPINGS = 'clamp'
  public wrapT: keyof typeof GL_TEXTURE_WRAPPINGS = 'clamp'
  public generateMipmaps = true
  public flipY = true
  public anisotropy = 1
  public needsUpdate = true
  readonly isTexture = true

  constructor(options?: Partial<TextureOptions>) {
    this.uuid = uuid()
    if (options) Object.assign(this, options)
  }

  /**
   * Sets this texture's image source from an `HTMLImageElement`.
   */
  async fromImage(image: HTMLImageElement) {
    await image.decode()
    this.image = await createImageBitmap(image)
    this.needsUpdate = true

    return this
  }

  /**
   * Sets this texture's image source from an `HTMLVideoElement`.
   */
  async fromVideo(video: HTMLVideoElement) {
    this.image = await createImageBitmap(video)
    this.generateMipmaps = false
    this.needsUpdate = video.readyState >= video.HAVE_CURRENT_DATA

    return this
  }

  /**
   * Sets this texture's image source from an `ArrayBufferView`.
   */
  async fromData(data: ArrayBufferView, width: number, height: number) {
    const source = new ImageData(new Uint8ClampedArray(data.buffer), width, height)
    this.image = await createImageBitmap(source)
    this.needsUpdate = true

    return this
  }

  /**
   * Disposes texture from GPU memory.
   */
  dispose() {
    // Implemented by renderer
  }
}
