import { Compiled, Renderer } from '../core/Renderer'
import { Texture } from '../core/Texture'
import type { TextureFilter, TextureWrapping } from '../core/Texture'
import type { BlendFactor, BlendOperation, CullSide, Material, Uniform, UniformList } from '../core/Material'
import type { AttributeList, AttributeData, Attribute, Geometry } from '../core/Geometry'
import type { TextureOptions } from '../core/Texture'
import type { DrawMode, Mesh } from '../core/Mesh'
import type { Object3D } from '../core/Object3D'
import type { Camera } from '../core/Camera'
import type { RenderTarget } from '../core/RenderTarget'
import { cloneUniform, lineNumbers, uniformsEqual } from '../utils'

const GL_TEXTURE_FILTERS: Record<TextureFilter, number> = {
  nearest: 9728,
  linear: 9729,
} as const

const GL_TEXTURE_MIPMAP_FILTERS: Record<TextureFilter, number> = {
  nearest: 9985,
  linear: 9986,
} as const

const GL_TEXTURE_WRAPPINGS: Record<TextureWrapping, number> = {
  clamp: 33071,
  repeat: 10497,
} as const

const GL_BLEND_OPERATIONS: Record<BlendOperation, number> = {
  add: 32774,
  subtract: 32778,
  'reverse-subtract': 32779,
  min: 32775,
  max: 32776,
} as const

const GL_BLEND_FACTORS: Record<BlendFactor, number> = {
  zero: 0,
  one: 1,
  src: 768,
  'one-minus-src': 769,
  'src-alpha': 770,
  'one-minus-src-alpha': 771,
  dst: 774,
  'one-minus-dst': 775,
  'dst-alpha': 772,
  'one-minus-dst-alpha': 773,
  'src-alpha-saturated': 776,
  constant: 32769,
  'one-minus-constant': 32770,
} as const

const GL_CULL_SIDES: Record<CullSide, number> = {
  front: 1029,
  back: 1028,
  both: 0,
} as const

const GL_DRAW_MODES: Record<DrawMode, number> = {
  points: 0,
  lines: 1,
  triangles: 4,
} as const

/**
 * Gets the appropriate WebGL data type for a data view.
 */
const getDataType = (data: AttributeData): number | null => {
  switch (data.constructor) {
    case Float32Array:
      return 5126 // FLOAT
    case Int8Array:
      return 5120 // BYTE
    case Int16Array:
      return 5122 // SHORT
    case Int32Array:
      return 5124 // INT
    case Uint8Array:
    case Uint8ClampedArray:
      return 5121 // UNSIGNED_BYTE
    case Uint16Array:
      return 5123 // UNSIGNED_SHORT
    case Uint32Array:
      return 5125 // UNSIGNED_INT
    default:
      return null
  }
}

/**
 * Constructs a WebGL VAO. Can be used to memoize gl state.
 */
export class WebGLVAO {
  readonly gl: WebGL2RenderingContext
  readonly VAO: WebGLVertexArrayObject

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.VAO = this.gl.createVertexArray()!
  }

  /**
   * Binds the VAO. Further modifications to global gl state are memoized.
   */
  bind(): void {
    this.gl.bindVertexArray(this.VAO)
  }

  /**
   * Unbinds the VAO. Further state is not memoized.
   */
  unbind(): void {
    this.gl.bindVertexArray(null)
  }

  /**
   * Disposes the VAO from GPU memory.
   */
  dispose(): void {
    this.gl.deleteVertexArray(this.VAO)
  }
}

/**
 * Constructs a WebGL buffer. Can be used to transmit binary data to the GPU.
 */
export class WebGLBufferObject {
  readonly gl: WebGL2RenderingContext
  readonly buffer: WebGLBuffer
  public type: number
  public usage: number

  constructor(gl: WebGL2RenderingContext, data: AttributeData, type = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) {
    this.gl = gl
    this.buffer = this.gl.createBuffer()!
    this.type = type
    this.usage = usage

    this.write(data)
  }

  /**
   * Binds the buffer. Will be affected by further read/write ops.
   */
  bind(): void {
    this.gl.bindBuffer(this.type, this.buffer)
  }

  /**
   * Unbinds the buffer. Not affected by further read/write ops.
   */
  unbind(): void {
    this.gl.bindBuffer(this.type, null)
  }

  /**
   * Writes binary data to buffer.
   */
  write(data: AttributeData): void {
    this.bind()

    const byteLength = this.gl.getBufferParameter(this.type, this.gl.BUFFER_SIZE)
    const usage = this.gl.getBufferParameter(this.type, this.gl.BUFFER_USAGE)

    if (data.byteOffset === 0 && (data.byteLength > byteLength || this.usage !== usage)) {
      this.gl.bufferData(this.type, data, this.usage)
    } else {
      this.gl.bufferSubData(this.type, data.byteOffset, data)
    }
  }

  /**
   * Disposes the buffer from GPU memory.
   */
  dispose(): void {
    this.gl.deleteBuffer(this.buffer)
  }
}

/**
 * Constructs a WebGL uniform buffer. Packs uniforms into a buffer.
 */
export class WebGLUniformBuffer extends WebGLBufferObject {
  readonly data: Float32Array
  readonly program: WebGLProgramObject
  readonly index: number
  readonly name: string

  constructor(gl: WebGL2RenderingContext, program: WebGLProgramObject, index = 0) {
    const byteLength = gl.getActiveUniformBlockParameter(program.program, index, gl.UNIFORM_BLOCK_DATA_SIZE)
    const data = new Float32Array(byteLength / Float32Array.BYTES_PER_ELEMENT)

    super(gl, data, gl.UNIFORM_BUFFER, gl.DYNAMIC_DRAW)
    this.gl.bindBufferBase(this.type, index, this.buffer)

    this.data = data
    this.program = program
    this.index = index
    this.name = gl.getActiveUniformBlockName(this.program.program, index)!
  }

  /**
   * Updates packed uniforms.
   */
  update(uniforms: UniformList): void {
    this.program.uniforms.forEach((memoized, name) => {
      // Only set uniforms in block
      if (memoized.blockIndex !== this.index) return

      // Skip textures and unchanged uniforms
      const uniform = uniforms[name.replace(`${this.name}.`, '')] as Exclude<Uniform, Texture>
      if (memoized.value != null && uniformsEqual(memoized.value!, uniform)) return

      // Memoize new values
      memoized.value = cloneUniform(uniform, memoized.value)

      // Update buffer storage
      const length = typeof uniform === 'number' ? 1 : uniform.length

      if (typeof uniform === 'number') this.data[memoized.offset] = uniform
      else this.data.set(uniform, memoized.offset)

      // Write to buffer
      this.write(this.data.subarray(memoized.offset, memoized.offset + length))
    })
  }
}

/**
 * Represents a WebGL active uniform and its layout properties.
 */
export interface WebGLActiveUniform {
  size: number
  type: number
  location: WebGLUniformLocation | -1
  blockIndex: number
  offset: number
  value?: Uniform
}

/**
 * Constructs a WebGL program. Manages active textures and uniforms.
 */
export class WebGLProgramObject {
  readonly gl: WebGL2RenderingContext
  readonly program: WebGLProgram
  readonly uniforms = new Map<string, WebGLActiveUniform>()
  readonly attributeLocations = new Map<string, number>()
  readonly textureLocations = new Map<string, number>()
  readonly UBOs = new Map<number, WebGLUniformBuffer>()

  constructor(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
    this.gl = gl
    this.program = this.gl.createProgram()!

    // Compile shaders
    const shaders = Object.entries({ vertex, fragment }).map(([type, source]) => {
      const target = type === 'vertex' ? this.gl.VERTEX_SHADER : this.gl.FRAGMENT_SHADER
      const shader = this.gl.createShader(target)!

      this.gl.shaderSource(shader, '#version 300 es\n' + source)
      this.gl.compileShader(shader)

      const error = gl.getShaderInfoLog(shader)
      if (error) throw `${error}\n${lineNumbers(source)}`

      return shader
    })

    // Attach shaders
    for (const shader of shaders) {
      this.gl.attachShader(this.program, shader)
    }

    // Link program
    this.gl.linkProgram(this.program)
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(this.program)
      throw `Error linking program: ${error}`
    }

    // Cleanup shaders
    for (const shader of shaders) {
      this.gl.detachShader(this.program, shader)
      this.gl.deleteShader(shader)
    }

    // Query active uniforms
    let textureIndex = 0
    const uniformsLength = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformsLength; i++) {
      const activeUniform = this.gl.getActiveUniform(this.program, i)
      if (activeUniform) {
        const { name, size, type } = activeUniform
        const location = this.getUniformLocation(name)
        const blockIndex = this.gl.getActiveUniforms(this.program, [i], this.gl.UNIFORM_BLOCK_INDEX)[0]
        const offset =
          this.gl.getActiveUniforms(this.program, [i], this.gl.UNIFORM_OFFSET)[0] / Float32Array.BYTES_PER_ELEMENT
        this.uniforms.set(name, { size, type, location, blockIndex, offset })

        if (type === this.gl.SAMPLER_2D) {
          this.textureLocations.set(name, textureIndex)
          textureIndex++
        }
      }
    }

    this.bind()
  }

  /**
   * Binds the program.
   */
  bind(): void {
    this.gl.useProgram(this.program)
  }

  /**
   * Unbinds the program.
   */
  unbind(): void {
    this.gl.useProgram(null)
  }

  /**
   * Returns an active attribute's location by name. Will return `-1` if not found.
   */
  getAttributeLocation(name: string): number {
    return this.gl.getAttribLocation(this.program, name)
  }

  /**
   * Returns an active uniform's location by name. Will return `-1` if not found.
   */
  getUniformLocation(name: string): WebGLUniformLocation | -1 {
    return this.gl.getUniformLocation(this.program, name) ?? -1
  }

  /**
   * Returns an active texture's location by name. Will return `-1` if not found.
   */
  getTextureLocation(name: string): number {
    return this.textureLocations.get(name) ?? -1
  }

  /**
   * Binds and activates a texture by name.
   */
  activateTexture(name: string, texture: WebGLTextureObject): void {
    const location = this.getTextureLocation(name)
    if (location !== -1) {
      this.gl.activeTexture(this.gl.TEXTURE0 + location)
      texture.bind()
    }
  }

  /**
   * Sets a uniform outside of std140 by name.
   */
  setUniform(name: string, value: Uniform): void {
    // Skip unused uniforms
    const uniform = this.uniforms.get(name)
    if (!uniform || uniform.location === -1) return

    // Set texture locations for texture uniforms
    const data = (this.textureLocations.get(name) ?? value) as number | number[]

    if (typeof data === 'number') {
      switch (uniform.type) {
        case this.gl.FLOAT:
          this.gl.uniform1f(uniform.location, data)
          break
        case this.gl.BOOL:
        case this.gl.INT:
        case this.gl.SAMPLER_2D:
          this.gl.uniform1i(uniform.location, data)
          break
      }
    } else {
      switch (uniform.type) {
        case this.gl.FLOAT_VEC2:
          this.gl.uniform2fv(uniform.location, data)
          break
        case this.gl.BOOL_VEC2:
        case this.gl.INT_VEC2:
          this.gl.uniform2iv(uniform.location, data)
          break
        case this.gl.FLOAT_VEC3:
          this.gl.uniform3fv(uniform.location, data)
          break
        case this.gl.BOOL_VEC3:
        case this.gl.INT_VEC3:
          this.gl.uniform3iv(uniform.location, data)
          break
        case this.gl.FLOAT_VEC4:
          this.gl.uniform4fv(uniform.location, data)
          break
        case this.gl.BOOL_VEC4:
        case this.gl.INT_VEC4:
          this.gl.uniform4iv(uniform.location, data)
          break
        case this.gl.FLOAT_MAT2:
          this.gl.uniformMatrix2fv(uniform.location, false, data)
          break
        case this.gl.FLOAT_MAT3:
          this.gl.uniformMatrix3fv(uniform.location, false, data)
          break
        case this.gl.FLOAT_MAT4:
          this.gl.uniformMatrix4fv(uniform.location, false, data)
          break
      }
    }

    // Memoize previous uniform values for diffing
    uniform.value = cloneUniform(value, uniform.value)
  }

  /**
   * Sets a program buffer attribute by name.
   */
  setAttribute(name: string, attribute: Attribute, buffer: WebGLBufferObject): void {
    const location = this.getAttributeLocation(name)
    if (location === -1) return

    buffer.bind()

    this.gl.enableVertexAttribArray(location)

    const dataType = getDataType(attribute.data)!
    if (dataType === this.gl.INT || dataType === this.gl.UNSIGNED_INT) {
      this.gl.vertexAttribIPointer(location, attribute.size, dataType, 0, 0)
    } else {
      this.gl.vertexAttribPointer(location, attribute.size, dataType, false, 0, 0)
    }

    this.attributeLocations.set(name, location)
  }

  /**
   * Disposes the program from GPU memory.
   */
  dispose(): void {
    this.uniforms.clear()
    this.attributeLocations.clear()
    this.textureLocations.clear()
    this.UBOs.forEach((UBO) => UBO.dispose())
    this.gl.deleteProgram(this.program)
  }
}

/**
 * Constructs a WebGL buffer attribute manager.
 */
export class WebGLBufferAttributes {
  readonly gl: WebGL2RenderingContext
  readonly buffers: Map<string, WebGLBufferObject> = new Map()

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
  }

  /**
   * Compiles and binds attributes into buffers.
   */
  setAttributes(program: WebGLProgramObject, attributes: AttributeList): void {
    for (const name in attributes) {
      const attribute = attributes[name]

      if (!this.buffers.has(name)) {
        const type = name === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER
        const buffer = new WebGLBufferObject(this.gl, attribute.data, type)
        this.buffers.set(name, buffer)
        attribute.needsUpdate = false
      }

      if (!program.attributeLocations.has(name)) {
        const buffer = this.buffers.get(name)!
        program.setAttribute(name, attribute, buffer)
      }
    }
  }

  /**
   * Updates attributes flagged for update.
   */
  update(attributes: AttributeList): void {
    for (const name in attributes) {
      const attribute = attributes[name]
      if (attribute.needsUpdate && this.buffers.has(name)) {
        const buffer = this.buffers.get(name)!
        buffer.write(attribute.data)
        attribute.needsUpdate = false
      }
    }
  }

  /**
   * Disposes of attributes from GPU memory.
   */
  dispose(): void {
    this.buffers.forEach((buffer) => buffer.dispose())
    this.buffers.clear()
  }
}

/**
 * Constructs a WebGL texture.
 */
export class WebGLTextureObject {
  readonly gl: WebGL2RenderingContext
  readonly target: WebGLTexture

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.target = this.gl.createTexture()!
  }

  /**
   * Binds the texture.
   */
  bind(): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.target)
  }

  /**
   * Unbinds the texture.
   */
  unbind(): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null)
  }

  /**
   * Updates the texture from `TextureOptions` with an optional `width` and `height`.
   */
  update(options: Texture | TextureOptions, width = 0, height = 0): void {
    this.bind()

    if (options.image) {
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, options.image)
    } else {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        width,
        height,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        null,
      )
    }

    if (options.anisotropy) {
      const anisotropyExt = this.gl.getExtension('EXT_texture_filter_anisotropic')
      if (anisotropyExt)
        this.gl.texParameterf(this.gl.TEXTURE_2D, anisotropyExt.TEXTURE_MAX_ANISOTROPY_EXT, options.anisotropy)
    }
    if (options.generateMipmaps) this.gl.generateMipmap(this.gl.TEXTURE_2D)
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)

    const minFilters = options.generateMipmaps ? GL_TEXTURE_MIPMAP_FILTERS : GL_TEXTURE_FILTERS
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, GL_TEXTURE_FILTERS[options.magFilter])
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilters[options.minFilter])

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, GL_TEXTURE_WRAPPINGS[options.wrapS])
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, GL_TEXTURE_WRAPPINGS[options.wrapT])
  }

  /**
   * Disposes of the texture from GPU memory.
   */
  dispose(): void {
    this.gl.deleteTexture(this.target)
  }
}

/**
 * Constructs a WebGL FBO with MRT and multi-sampling.
 */
export class WebGLFBO {
  readonly gl: WebGL2RenderingContext
  readonly width: number
  readonly height: number
  readonly count: number
  readonly samples: number
  readonly frameBuffer: WebGLFramebuffer
  readonly copyFrameBuffer: WebGLFramebuffer
  readonly textures: WebGLTextureObject[]
  readonly renderBuffers: WebGLRenderbuffer[]

  constructor(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    count = 1,
    samples = 0,
    textures: WebGLTextureObject[] = [],
  ) {
    this.gl = gl
    this.width = width
    this.height = height
    this.count = count
    this.samples = samples

    this.frameBuffer = this.gl.createFramebuffer()!
    this.copyFrameBuffer = this.gl.createFramebuffer()!
    this.textures = textures
    this.renderBuffers = []

    this.bind()

    const attachments: number[] = []
    for (let i = 0; i < this.count; i++) {
      const attachment = this.gl.COLOR_ATTACHMENT0 + i
      attachments.push(attachment)

      if (this.samples) {
        const renderBuffer = this.gl.createRenderbuffer()!
        this.renderBuffers.push(renderBuffer)

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderBuffer)
        this.gl.renderbufferStorageMultisample(
          this.gl.RENDERBUFFER,
          this.samples,
          this.gl.RGBA8,
          this.width,
          this.height,
        )
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, attachment, this.gl.RENDERBUFFER, renderBuffer)
      } else if (this.textures.length) {
        const texture = this.textures[i]
        this.gl.framebufferTexture2D(this.gl.DRAW_FRAMEBUFFER, attachment, this.gl.TEXTURE_2D, texture.target, 0)
      }
    }
    this.gl.drawBuffers(attachments)

    this.unbind()
  }

  /**
   * Binds the FBO.
   */
  bind(type = this.gl.FRAMEBUFFER): void {
    this.gl.bindFramebuffer(type, this.frameBuffer)
  }

  /**
   * Unbinds the FBO.
   */
  unbind(type = this.gl.FRAMEBUFFER): void {
    this.gl.bindFramebuffer(type, null)
  }

  /**
   * Downsamples the FBO and its attachments to be readable via `blitFramebuffer`. Supports MRT.
   */
  blit(): void {
    // blitFramebuffer can only copy the first color attachment to another FBO
    // so we unbind FBO attachments and copy renderBuffers to textures one by one
    // (See issue #12): https://www.khronos.org/registry/OpenGL/extensions/EXT/EXT_framebuffer_blit.txt

    // Remove FBO attachments
    for (let i = 0; i < this.count; i++) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer)
      this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0 + i, this.gl.RENDERBUFFER, null)

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.copyFrameBuffer)
      this.gl.framebufferTexture2D(this.gl.DRAW_FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0 + i, this.gl.TEXTURE_2D, null, 0)
    }

    // Blit multi-sampled renderBuffers to textures
    this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.frameBuffer)
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.copyFrameBuffer)
    for (let i = 0; i < this.count; i++) {
      const renderBuffer = this.renderBuffers[i]
      this.gl.framebufferRenderbuffer(
        this.gl.READ_FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.RENDERBUFFER,
        renderBuffer,
      )

      const texture = this.textures[i]
      this.gl.framebufferTexture2D(
        this.gl.DRAW_FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.TEXTURE_2D,
        texture.target,
        0,
      )
      this.gl.blitFramebuffer(
        0,
        0,
        this.width,
        this.height,
        0,
        0,
        this.width,
        this.height,
        this.gl.COLOR_BUFFER_BIT,
        this.gl.NEAREST,
      )
    }
    this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, null)
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null)

    // Reconstruct FBO attachments
    for (let i = 0; i < this.count; i++) {
      const renderBuffer = this.renderBuffers[i]
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer)
      this.gl.framebufferRenderbuffer(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0 + i,
        this.gl.RENDERBUFFER,
        renderBuffer,
      )

      const texture = this.textures[i]
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.copyFrameBuffer)
      this.gl.framebufferTexture2D(
        this.gl.DRAW_FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0 + i,
        this.gl.TEXTURE_2D,
        texture.target,
        0,
      )
    }
  }

  /**
   * Disposes of the FBO from GPU memory.
   */
  dispose(): void {
    this.gl.deleteFramebuffer(this.frameBuffer)
    this.gl.deleteFramebuffer(this.copyFrameBuffer)
    for (const renderBuffer of this.renderBuffers) this.gl.deleteRenderbuffer(renderBuffer)
  }
}

export interface WebGLRendererOptions {
  /**
   * An optional canvas element to draw to.
   */
  canvas: HTMLCanvasElement
  /**
   * An optional WebGL2 context to draw with.
   */
  context: WebGL2RenderingContext
  /**
   * Whether to draw with a transparent background. Default is `true`.
   */
  alpha: boolean
  /**
   * Whether to enable anti-aliasing for sharp corners. Default is `false`.
   */
  antialias: boolean
  /**
   * Whether to create a depth buffer to depth test with. Default is `true`.
   */
  depth: boolean
  /**
   * Whether to create a stencil buffer. Useful for masking, reflections, and per-pixel optimizations. Default is `false`.
   */
  stencil: boolean
  /**
   * Whether to bail if on a low-end system or if no dedicated GPU is available. Default is `false`.
   */
  failIfMajorPerformanceCaveat: boolean
  /**
   * Whether to fade out colors with transparency. Default is `true`.
   */
  premultipliedAlpha: boolean
  /**
   * Whether to copy the drawing buffer to screen instead of swapping at the expense of performance. Default is `false`.
   */
  preserveDrawingBuffer: boolean
  /**
   * Whether to prioritize rendering performance or power efficiency. Defaults to `default` to automatically balance.
   */
  powerPreference: 'default' | 'high-performance' | 'low-power'
}

export class WebGLRenderer extends Renderer {
  /**
   * Internal WebGL2 context to draw with.
   */
  readonly gl: WebGL2RenderingContext
  /**
   * Whether to clear the drawing buffer between renders. Default is `true`.
   */
  public autoClear = true

  protected _params: Partial<Omit<WebGLRendererOptions, 'canvas' | 'context'>>
  protected _VAOs = new Compiled<Mesh, WebGLVAO>()
  protected _programs = new Compiled<Material, WebGLProgramObject>()
  protected _bufferAttributes = new Compiled<Geometry, WebGLBufferAttributes>()
  protected _textures = new Compiled<Texture, WebGLTextureObject>()
  protected _FBOs = new Compiled<RenderTarget, WebGLFBO>()

  constructor({
    canvas = document.createElement('canvas'),
    context,
    alpha = true,
    antialias = false,
    depth = true,
    stencil = false,
    failIfMajorPerformanceCaveat = false,
    premultipliedAlpha = true,
    preserveDrawingBuffer = false,
    powerPreference = 'default',
  }: Partial<WebGLRendererOptions> = {}) {
    super()
    this._params = {
      alpha,
      antialias,
      depth,
      failIfMajorPerformanceCaveat,
      premultipliedAlpha,
      preserveDrawingBuffer,
      powerPreference,
      stencil,
    }

    this.canvas = canvas
    this.gl = context ?? (this.canvas.getContext('webgl2', this._params) as WebGL2RenderingContext)

    if (depth) {
      this.gl.enable(this.gl.DEPTH_TEST)
      this.gl.depthFunc(this.gl.LESS)
    }

    this.setSize(canvas.width, canvas.height)
  }

  setViewport(x: number, y: number, width: number, height: number): void {
    super.setViewport(x, y, width, height)

    const scaledWidth = Math.floor(width * this.pixelRatio)
    const scaledHeight = Math.floor(height * this.pixelRatio)
    this.gl.viewport(x, y, scaledWidth, scaledHeight)
  }

  setScissor(x: number, y: number, width: number, height: number): void {
    super.setScissor(x, y, width, height)
    this.gl.scissor(x, y, width, height)
  }

  /**
   * Enables scissor test. Useful for toggling rendering in certain regions.
   */
  setScissorTest(enabled: boolean): void {
    if (enabled) {
      this.gl.enable(this.gl.SCISSOR_TEST)
    } else {
      this.gl.disable(this.gl.SCISSOR_TEST)
    }
  }

  /**
   * Sets cull face mode. Useful for reducing drawn faces at runtime.
   */
  setCullFace(cullMode: number): void {
    if (cullMode) {
      this.gl.enable(this.gl.CULL_FACE)
      this.gl.cullFace(cullMode)
    } else {
      this.gl.disable(this.gl.CULL_FACE)
    }
  }

  /**
   * Enables depth test. Useful for controlling occlusion behavior.
   */
  setDepthTest(enabled: boolean): void {
    if (enabled) {
      this.gl.enable(this.gl.DEPTH_TEST)
    } else {
      this.gl.disable(this.gl.DEPTH_TEST)
    }
  }

  /**
   * Toggles depthmask. Useful for controlling objects can occlude others.
   */
  setDepthMask(enabled: boolean): void {
    this.gl.depthMask(enabled)
  }

  /**
   * Sets the active frameBuffer to render to.
   */
  setFrameBuffer(frameBuffer: WebGLFramebuffer | null, target = this.gl.FRAMEBUFFER): void {
    this.gl.bindFramebuffer(target, frameBuffer)
  }

  /**
   * Clears color and depth buffers.
   */
  clear(mask = this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT): void {
    this.gl.clear(mask)

    const multiplier = this._params.premultipliedAlpha ? this.clearAlpha : 1
    this.gl.clearColor(
      this.clearColor.r * multiplier,
      this.clearColor.g * multiplier,
      this.clearColor.b * multiplier,
      this.clearAlpha,
    )
  }

  compile(target: Mesh, camera?: Camera): void {
    // Update mesh built-ins
    target.material.uniforms.modelMatrix = target.matrix

    if (camera) {
      target.material.uniforms.projectionMatrix = camera.projectionMatrix
      target.material.uniforms.viewMatrix = camera.viewMatrix
      target.material.uniforms.normalMatrix = target.normalMatrix

      target.modelViewMatrix.copy(camera.viewMatrix).multiply(target.matrix)
      target.normalMatrix.getNormalMatrix(target.modelViewMatrix)
    }

    // Compile mesh VAO
    if (!this._VAOs.has(target)) {
      this._VAOs.set(target, new WebGLVAO(this.gl))
    }

    // Bind VAO to memoize further gl state
    const VAO = this._VAOs.get(target)!
    VAO.bind()

    // Compile program
    if (!this._programs.has(target.material)) {
      const program = new WebGLProgramObject(this.gl, target.material.vertex, target.material.fragment)
      this._programs.set(target.material, program)

      // Keep track of defined UBOs
      let numUBOs = 0

      // Set global uniforms
      program.uniforms.forEach((activeUniform, name) => {
        if (activeUniform.location !== -1) {
          const uniform = target.material.uniforms[name]
          program.setUniform(name, uniform)

          if (uniform instanceof Texture) {
            if (!this._textures.has(uniform)) {
              this._textures.set(uniform, new WebGLTextureObject(this.gl))
            }

            const compiled = this._textures.get(uniform)!
            program.activateTexture(name, compiled)
          }
        } else if (activeUniform.blockIndex !== -1) {
          numUBOs = Math.max(numUBOs, activeUniform.blockIndex + 1)
        }
      })

      // Create UBOs
      for (let i = 0; i < numUBOs; i++) {
        const UBO = new WebGLUniformBuffer(this.gl, program, i)
        program.UBOs.set(i, UBO)
      }
    }

    // Update uniform buffers
    const program = this._programs.get(target.material)!
    program.UBOs.forEach((UBO) => UBO.update(target.material.uniforms))

    // Update global uniforms
    program.uniforms.forEach(({ location, value }, name) => {
      const uniform = target.material.uniforms[name]
      if (location === -1) return

      if (uniform instanceof Texture) {
        if (uniform.needsUpdate) {
          const compiled = this._textures.get(uniform)!
          compiled.update(uniform)
          uniform.needsUpdate = false
        }
      } else if (!uniformsEqual(value!, uniform)) {
        program.setUniform(name, uniform)
      }
    })

    // Compile buffer attributes
    if (!this._bufferAttributes.has(target.geometry)) {
      const bufferAttributes = new WebGLBufferAttributes(this.gl)
      this._bufferAttributes.set(target.geometry, bufferAttributes)
    }

    // Bind and update buffer attributes
    const bufferAttributes = this._bufferAttributes.get(target.geometry)!
    bufferAttributes.setAttributes(program, target.geometry.attributes)
    bufferAttributes.update(target.geometry.attributes)

    // Update material state
    this.setCullFace(GL_CULL_SIDES[target.material.side])
    this.setDepthTest(target.material.depthTest)
    this.setDepthMask(target.material.depthWrite)

    if (target.material.blending) {
      this.gl.enable(this.gl.BLEND)
      this.gl.blendFuncSeparate(
        GL_BLEND_FACTORS[target.material.blending.color.srcFactor!],
        GL_BLEND_FACTORS[target.material.blending.color.dstFactor!],
        GL_BLEND_FACTORS[target.material.blending.alpha.srcFactor!],
        GL_BLEND_FACTORS[target.material.blending.alpha.dstFactor!],
      )
      this.gl.blendEquationSeparate(
        GL_BLEND_OPERATIONS[target.material.blending.color.operation!],
        GL_BLEND_OPERATIONS[target.material.blending.alpha.operation!],
      )
    } else {
      this.gl.disable(this.gl.BLEND)
    }

    // Cleanup
    VAO.unbind()
  }

  setRenderTarget(renderTarget: RenderTarget | null): void {
    super.setRenderTarget(renderTarget)

    if (renderTarget) this.gl.viewport(0, 0, renderTarget.width, renderTarget.height)
    else this.setViewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height)
  }

  render(scene: Object3D, camera?: Camera): void {
    // Compile render target
    if (this._renderTarget && !this._FBOs.has(this._renderTarget)) {
      const { width, height, count, samples } = this._renderTarget

      // Init texture attachments
      const textures = this._renderTarget.textures.map((texture) => {
        if (!this._textures.has(texture)) {
          this._textures.set(texture, new WebGLTextureObject(this.gl))
        }

        const compiled = this._textures.get(texture)!
        if (texture.needsUpdate) {
          compiled.update(texture, width, height)
          texture.needsUpdate = false
        }

        return compiled
      })

      const FBO = new WebGLFBO(this.gl, width, height, count, samples, textures)
      this._FBOs.set(this._renderTarget, FBO)
    }

    // Bind render target
    const FBO = this._FBOs.get(this._renderTarget!)
    this.setFrameBuffer(FBO?.frameBuffer ?? null)

    // Clear screen
    if (this.autoClear) this.clear()

    // Update scene matrices
    if (scene.autoUpdate) scene.updateMatrix()

    // Update camera matrices
    if (camera?.autoUpdate) {
      if (camera.parent === null) camera.updateMatrix()
      camera.updateProjectionMatrix(true)
    }

    // Compile & render visible children
    const renderList = this.sort(scene, camera)
    for (const child of renderList) {
      // Compile on first render, otherwise update
      this.compile(child, camera)

      // Bind
      const VAO = this._VAOs.get(child)!
      VAO.bind()

      // Alternate drawing for indexed and non-indexed children
      const { index, position } = child.geometry.attributes
      const mode = GL_DRAW_MODES[child.mode]
      if (index) {
        this.gl.drawElements(mode, index.data.length / index.size, getDataType(index.data)!, 0)
      } else {
        this.gl.drawArrays(mode, 0, position.data.length / position.size)
      }

      // Unbind
      VAO.unbind()
    }

    // Update current FBO
    if (FBO) FBO.blit()
  }
}
