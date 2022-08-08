import { uuid } from '../utils'

/**
 * Represents a texture image source.
 */
export type ImageRepresentation = ImageBitmap | HTMLCanvasElement

/**
 * Represents a texture texel filter.
 */
export type TextureFilter = 'nearest' | 'linear'

/**
 * Represents a texture wrapping mode.
 */
export type TextureWrapping = 'clamp' | 'repeat'

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
  magFilter: TextureFilter
  /**
   * How to sample when a texel is less than 1 pixel. Default is `nearest`.
   */
  minFilter: TextureFilter
  /**
   * Horizontal UV wrapping. Default is `clamp`.
   */
  wrapS: TextureWrapping
  /**
   * Vertical UV wrapping. Default is `clamp`.
   */
  wrapT: TextureWrapping
  /**
   * Whether to generate mipmaps for increased perceived quality. Default is `true`.
   */
  generateMipmaps: boolean
  /**
   * Vertically flips the texture when uploading to the GPU. Default is `true`.
   */
  flipY: boolean
  /**
   * Number of samples for anisotropic filtering. Eliminates aliasing at oblique angles. Default is `1`.
   */
  anisotropy: number
}

/**
 * Constructs a texture. Useful for displaying and storing image data.
 */
export class Texture implements TextureOptions {
  readonly uuid: string
  public image?: ImageRepresentation
  public magFilter: TextureFilter = 'nearest'
  public minFilter: TextureFilter = 'nearest'
  public wrapS: TextureWrapping = 'clamp'
  public wrapT: TextureWrapping = 'clamp'
  public generateMipmaps = true
  public flipY = true
  public anisotropy = 1
  public needsUpdate = true

  constructor(options?: Partial<TextureOptions>) {
    this.uuid = uuid()
    if (options) Object.assign(this, options)
  }

  private get _bitmapOptions(): ImageBitmapOptions {
    return { imageOrientation: this.flipY ? 'flipY' : 'none' }
  }

  /**
   * Sets this texture's image source from an `HTMLImageElement` or `SVGImageElement`.
   */
  async fromImage(image: HTMLOrSVGImageElement): Promise<this> {
    if (image instanceof HTMLImageElement) await image.decode()
    this.image = await createImageBitmap(image, this._bitmapOptions)
    this.needsUpdate = true

    return this
  }

  /**
   * Sets this texture's image source from an `HTMLVideoElement`.
   */
  async fromVideo(video: HTMLVideoElement): Promise<this> {
    this.image = await createImageBitmap(video, this._bitmapOptions)
    this.generateMipmaps = false
    this.needsUpdate = video.readyState >= video.HAVE_CURRENT_DATA

    return this
  }

  /**
   * Sets this texture's image source from an `ArrayBufferView`.
   */
  async fromData(data: ArrayBufferView, width: number, height: number): Promise<this> {
    const source = new ImageData(new Uint8ClampedArray(data.buffer), width, height)
    this.image = await createImageBitmap(source, this._bitmapOptions)
    this.needsUpdate = true

    return this
  }

  /**
   * Disposes texture from GPU memory.
   */
  dispose(): void {
    // Implemented by renderer

    if (this.image instanceof ImageBitmap) this.image.close()
  }
}
