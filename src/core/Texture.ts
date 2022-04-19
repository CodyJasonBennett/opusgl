import type { GL_TEXTURE_FILTERS, GL_TEXTURE_WRAPPINGS } from '../constants'
import { uuid } from '../utils'

export type ImageRepresentation = ImageBitmap | HTMLCanvasElement

export interface TextureOptions {
  image: ImageRepresentation
  magFilter: keyof typeof GL_TEXTURE_FILTERS
  minFilter: keyof typeof GL_TEXTURE_FILTERS
  wrapS: keyof typeof GL_TEXTURE_WRAPPINGS
  wrapT: keyof typeof GL_TEXTURE_WRAPPINGS
  generateMipmaps: boolean
  flipY: boolean
  anisotropy: number
  needsUpdate: boolean
}

export class Texture implements TextureOptions {
  readonly uuid: string
  public image!: ImageRepresentation
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

  async fromImage(image: HTMLImageElement) {
    await image.decode()
    this.image = await createImageBitmap(image)
    this.needsUpdate = true

    return this
  }

  async fromVideo(video: HTMLVideoElement) {
    this.image = await createImageBitmap(video)
    this.generateMipmaps = false
    this.needsUpdate = video.readyState >= video.HAVE_CURRENT_DATA

    return this
  }

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
