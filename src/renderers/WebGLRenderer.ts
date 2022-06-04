import { Compiled, Renderer } from '../core/Renderer'
import { Texture } from '../core/Texture'
import type { Disposable } from '../core/Renderer'
import type { Uniform, UniformList } from '../core/Material'
import type { AttributeList, AttributeData, Attribute } from '../core/Geometry'
import type { TextureOptions } from '../core/Texture'
import type { Mesh } from '../core/Mesh'
import type { Object3D } from '../core/Object3D'
import type { Camera } from '../core/Camera'
import type { RenderTarget } from '../core/RenderTarget'
import {
  GL_SHADER_TEMPLATES,
  GL_TEXTURE_FILTERS,
  GL_TEXTURE_MIPMAP_FILTERS,
  GL_TEXTURE_WRAPPINGS,
  GL_CULL_SIDES,
  GL_DRAW_MODES,
} from '../constants'
import { cloneUniform, std140, uniformsEqual, parseUniforms } from '../utils'

/**
 * Gets the appropriate WebGL data type for a data view.
 */
const getDataType = (data: AttributeData) => {
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
export class WebGLVAO implements Disposable {
  readonly gl: WebGL2RenderingContext
  readonly VAO: WebGLVertexArrayObject

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.VAO = this.gl.createVertexArray()!
  }

  /**
   * Binds the VAO. Further modifications to global gl state are memoized.
   */
  bind() {
    this.gl.bindVertexArray(this.VAO)
  }

  /**
   * Unbinds the VAO. Further state is not memoized.
   */
  unbind() {
    this.gl.bindVertexArray(null)
  }

  /**
   * Disposes the VAO from GPU memory.
   */
  dispose() {
    this.gl.deleteVertexArray(this.VAO)
  }
}

/**
 * Constructs a WebGL buffer. Can be used to transmit binary data to the GPU.
 */
export class WebGLBufferObject implements Disposable {
  readonly gl: WebGL2RenderingContext
  readonly buffer: WebGLBuffer
  readonly type: number
  readonly usage: number

  constructor(
    gl: WebGL2RenderingContext,
    data: AttributeData | number,
    type = gl.ARRAY_BUFFER,
    usage = gl.STATIC_DRAW,
  ) {
    this.gl = gl
    this.buffer = this.gl.createBuffer()!
    this.type = type
    this.usage = usage

    this.bind()
    // @ts-ignore
    this.gl.bufferData(this.type, data, this.usage)
  }

  /**
   * Binds the buffer. Will be affected by further read/write ops.
   */
  bind() {
    this.gl.bindBuffer(this.type, this.buffer)
  }

  /**
   * Unbinds the buffer. Not affected by further read/write ops.
   */
  unbind() {
    this.gl.bindBuffer(this.type, null)
  }

  /**
   * Writes binary data to buffer.
   */
  write(data: AttributeData) {
    this.bind()
    this.gl.bufferSubData(this.type, 0, data)
  }

  /**
   * Disposes the VAO from GPU memory.
   */
  dispose() {
    this.gl.deleteBuffer(this.buffer)
  }
}

/**
 * Constructs a WebGL uniform buffer. Packs uniforms into a buffer via std140.
 */
export class WebGLUniformBuffer extends WebGLBufferObject {
  readonly data: Float32Array
  readonly uniforms: Map<string, Uniform>
  readonly index: number

  constructor(gl: WebGL2RenderingContext, uniforms: UniformList, index = 0) {
    const memoizedUniforms = new Map<string, Uniform>()
    for (const name in uniforms) {
      const uniform = uniforms[name]
      memoizedUniforms.set(name, cloneUniform(uniform))
    }

    const data = std140(Array.from(memoizedUniforms.values()))

    super(gl, data.byteLength, gl.UNIFORM_BUFFER, gl.DYNAMIC_DRAW)
    this.gl.bindBufferBase(this.type, index, this.buffer)

    this.data = data
    this.uniforms = memoizedUniforms
    this.index = index
  }

  /**
   * Updates packed uniforms.
   */
  update(uniforms: UniformList) {
    // Check whether a uniform has changed
    let needsUpdate = false
    this.uniforms.forEach((value, name) => {
      const uniform = uniforms[name]
      if (uniform == null || uniformsEqual(value, uniform)) return

      this.uniforms.set(name, cloneUniform(uniform))
      needsUpdate = true
    })

    // If a uniform changed, rebuild entire buffer
    // TODO: expand write to subdata at affected indices instead
    if (needsUpdate) {
      this.write(std140(Array.from(this.uniforms.values()), this.data))
    }
  }

  dispose() {
    super.dispose()
    this.uniforms.clear()
  }
}

/**
 * Constructs a WebGL program. Manages active textures and uniforms.
 */
export class WebGLProgramObject {
  readonly gl: WebGL2RenderingContext
  readonly program: WebGLProgram
  readonly uniforms = new Map<string, { size: number; type: number; location: WebGLUniformLocation }>()
  readonly attributes = new Map<string, { buffer: WebGLBufferObject; location: number }>()
  readonly textureLocations = new Map<string, number>()
  readonly UBOs = new Map<number, WebGLUniformBuffer>()

  constructor(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
    this.gl = gl
    this.program = this.gl.createProgram()!

    // Compile shaders
    const shaders = Object.entries({ vertex, fragment }).map(([type, source]) => {
      const target = type === 'vertex' ? this.gl.VERTEX_SHADER : this.gl.FRAGMENT_SHADER
      const shader = this.gl.createShader(target)!

      const template = GL_SHADER_TEMPLATES[type as keyof typeof GL_SHADER_TEMPLATES]
      this.gl.shaderSource(shader, template + source)

      this.gl.compileShader(shader)
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        const error = this.gl.getShaderInfoLog(shader)
        throw `Error compiling ${type} shader: ${error}`
      }

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
        this.uniforms.set(name, { size, type, location })

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
  bind() {
    this.gl.useProgram(this.program)
  }

  /**
   * Unbinds the program.
   */
  unbind() {
    this.gl.useProgram(null)
  }

  /**
   * Returns an active attribute's location by name. Will return `-1` if not found.
   */
  getAttributeLocation(name: string) {
    return this.gl.getAttribLocation(this.program, name)
  }

  /**
   * Returns an active uniform's location by name. Will return `-1` if not found.
   */
  getUniformLocation(name: string) {
    return this.gl.getUniformLocation(this.program, name) ?? -1
  }

  /**
   * Returns an active texture's location by name. Will return `-1` if not found.
   */
  getTextureLocation(name: string) {
    return this.textureLocations.get(name) ?? -1
  }

  /**
   * Binds and activates a texture by name.
   */
  activateTexture(name: string, texture: WebGLTextureObject) {
    const location = this.getTextureLocation(name)
    if (location !== -1) {
      this.gl.activeTexture(this.gl.TEXTURE0 + location)
      texture.bind()
    }
  }

  /**
   * Sets a uniform outside of std140 by name.
   */
  setUniform(name: string, value: Uniform) {
    const uniform = this.uniforms.get(name)
    if (!uniform) return

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

    return uniform
  }

  /**
   * Sets a program buffer attribute by name.
   */
  setAttribute(name: string, attribute: Attribute, buffer: WebGLBufferObject) {
    const location = this.getAttributeLocation(name)
    if (location !== -1) {
      this.gl.enableVertexAttribArray(location)

      const dataType = getDataType(attribute.data)!
      if (dataType === this.gl.INT || dataType === this.gl.UNSIGNED_INT) {
        this.gl.vertexAttribIPointer(location, attribute.size, dataType, 0, 0)
      } else {
        this.gl.vertexAttribPointer(location, attribute.size, dataType, false, 0, 0)
      }
    }

    this.attributes.set(name, { buffer, location })
  }

  /**
   * Disposes the program from GPU memory.
   */
  dispose() {
    this.UBOs.forEach((UBO) => UBO.dispose())
    this.bind()
    this.attributes.forEach(({ location }) => {
      if (location !== -1) this.gl.disableVertexAttribArray(location)
    })
    this.unbind()
    this.gl.deleteProgram(this.program)
  }
}

/**
 * Constructs a WebGL buffer attribute manager.
 */
export class WebGLBufferAttributes implements Disposable {
  readonly gl: WebGL2RenderingContext
  readonly buffers: Map<string, WebGLBufferObject> = new Map()
  readonly programs: WebGLProgramObject[] = []

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
  }

  /**
   * Compiles and binds program attributes into buffers.
   */
  setAttributes(program: WebGLProgramObject, attributes: AttributeList) {
    for (const name in attributes) {
      const attribute = attributes[name]

      let buffer = this.buffers.get(name)
      if (!buffer) {
        const type = name === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER
        buffer = this.buffers.get(name) ?? new WebGLBufferObject(this.gl, attribute.data, type)
        attribute.needsUpdate = false
      }

      program.setAttribute(name, attribute, buffer)
    }

    this.programs.push(program)
  }

  /**
   * Updates program attributes flagged for update.
   */
  update(attributes: AttributeList) {
    this.buffers.forEach((buffer, name) => {
      const attribute = attributes[name]
      if (attribute.needsUpdate) {
        buffer.write(attribute.data)
        attribute.needsUpdate = false
      }
    })
  }

  /**
   * Disposes of program attributes from GPU memory.
   */
  dispose() {
    this.buffers.forEach((buffer) => buffer.dispose())
    this.buffers.clear()
    for (const program of this.programs) {
      program.bind()
      program.attributes.forEach(({ location }) => {
        if (location !== -1) this.gl.disableVertexAttribArray(location)
      })
      program.unbind()
    }
    this.programs.slice(0, this.programs.length)
  }
}

/**
 * Constructs a WebGL texture.
 */
export class WebGLTextureObject implements Disposable {
  readonly gl: WebGL2RenderingContext
  readonly target: WebGLTexture

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.target = this.gl.createTexture()!
  }

  /**
   * Binds the texture.
   */
  bind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.target)
  }

  /**
   * Unbinds the texture.
   */
  unbind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null)
  }

  /**
   * Updates the texture from `TextureOptions` with an optional `width` and `height`.
   */
  update(options: Texture | TextureOptions, width = 0, height = 0) {
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

    if (options.flipY) this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, options.flipY)

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

    return this
  }

  /**
   * Disposes of the texture from GPU memory.
   */
  dispose() {
    this.gl.deleteTexture(this.target)
  }
}

/**
 * Constructs a WebGL FBO with MRT and multi-sampling.
 */
export class WebGLFBO implements Disposable {
  readonly gl: WebGL2RenderingContext
  readonly width: number
  readonly height: number
  readonly count: number
  readonly samples: number
  readonly frameBuffer: WebGLFramebuffer
  readonly multisampleFrameBuffer: WebGLFramebuffer
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
    this.multisampleFrameBuffer = this.gl.createFramebuffer()!
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
  bind(type = this.gl.FRAMEBUFFER, multisampled = this.samples) {
    this.gl.bindFramebuffer(type, multisampled ? this.multisampleFrameBuffer : this.frameBuffer)
  }

  /**
   * Unbinds the FBO.
   */
  unbind(type = this.gl.FRAMEBUFFER) {
    this.gl.bindFramebuffer(type, null)
  }

  /**
   * Downsamples the FBO and its attachments to be readable via `blitFramebuffer`. Supports MRT.
   */
  blit() {
    // blitFramebuffer can only copy the first color attachment to another FBO
    // so we unbind FBO attachments and copy renderBuffers to textures one by one
    // (See issue #12): https://www.khronos.org/registry/OpenGL/extensions/EXT/EXT_framebuffer_blit.txt

    // Remove FBO attachments
    for (let i = 0; i < this.count; i++) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.multisampleFrameBuffer)
      this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0 + i, this.gl.RENDERBUFFER, null)

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer)
      this.gl.framebufferTexture2D(this.gl.DRAW_FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0 + i, this.gl.TEXTURE_2D, null, 0)
    }

    // Blit multi-sampled renderBuffers to textures
    this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.multisampleFrameBuffer)
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.frameBuffer)
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
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.multisampleFrameBuffer)
      this.gl.framebufferRenderbuffer(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0 + i,
        this.gl.RENDERBUFFER,
        renderBuffer,
      )

      const texture = this.textures[i]
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer)
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
  dispose() {
    this.gl.deleteFramebuffer(this.frameBuffer)
    this.gl.deleteFramebuffer(this.multisampleFrameBuffer)
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
  protected _VAOs = new Compiled<WebGLVAO>()
  protected _programs = new Compiled<WebGLProgramObject>()
  protected _bufferAttributes = new Compiled<WebGLBufferAttributes>()
  protected _textures = new Compiled<WebGLTextureObject>()
  protected _FBOs = new Compiled<WebGLFBO>()

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

  setViewport(x: number, y: number, width: number, height: number) {
    super.setViewport(x, y, width, height)

    const scaledWidth = Math.floor(width * this.pixelRatio)
    const scaledHeight = Math.floor(height * this.pixelRatio)
    this.gl.viewport(x, y, scaledWidth, scaledHeight)
  }

  setScissor(x: number, y: number, width: number, height: number) {
    super.setScissor(x, y, width, height)
    this.gl.scissor(x, y, width, height)
  }

  /**
   * Enables scissor test. Useful for toggling rendering in certain regions.
   */
  setScissorTest(enabled: boolean) {
    if (enabled) {
      this.gl.enable(this.gl.SCISSOR_TEST)
    } else {
      this.gl.disable(this.gl.SCISSOR_TEST)
    }
  }

  /**
   * Sets cull face mode. Useful for reducing drawn faces at runtime.
   */
  setCullFace(cullMode: typeof GL_CULL_SIDES[keyof typeof GL_CULL_SIDES]) {
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
  setDepthTest(enabled: boolean) {
    if (enabled) {
      this.gl.enable(this.gl.DEPTH_TEST)
    } else {
      this.gl.disable(this.gl.DEPTH_TEST)
    }
  }

  /**
   * Toggles depthmask. Useful for controlling objects can occlude others.
   */
  setDepthMask(enabled: boolean) {
    this.gl.depthMask(enabled)
  }

  /**
   * Sets the active frameBuffer to render to.
   */
  setFrameBuffer(frameBuffer: WebGLFramebuffer | null, target = this.gl.FRAMEBUFFER) {
    this.gl.bindFramebuffer(target, frameBuffer)
  }

  /**
   * Clears color and depth buffers.
   */
  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)

    const multiplier = this._params.premultipliedAlpha ? this.clearAlpha : 1
    this.gl.clearColor(
      this.clearColor.r * multiplier,
      this.clearColor.g * multiplier,
      this.clearColor.b * multiplier,
      this.clearAlpha,
    )
  }

  compile(target: Mesh, camera?: Camera) {
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

      // Parse used uniforms
      const parsed = parseUniforms(target.material.vertex, target.material.fragment)

      // Set std140 uniforms
      if (parsed) {
        const uniforms = parsed.reduce((acc, key) => ({ ...acc, [key]: target.material.uniforms[key] }), {})
        const UBO = new WebGLUniformBuffer(this.gl, uniforms, program.UBOs.size)
        program.UBOs.set(UBO.index, UBO)
      }

      // Set texture uniform samplers outside of std140
      for (const name in target.material.uniforms) {
        const uniform = target.material.uniforms[name]

        if (uniform instanceof Texture) {
          program.setUniform(name, uniform)

          if (!this._textures.has(uniform)) {
            this._textures.set(uniform, new WebGLTextureObject(this.gl))
          }

          const compiled = this._textures.get(uniform)!
          program.activateTexture(name, compiled)
        }
      }
    }

    // Update uniforms
    const program = this._programs.get(target.material)!
    program.UBOs.forEach((UBO) => UBO.update(target.material.uniforms))

    // Update textures outside of std140
    program.textureLocations.forEach((_, name) => {
      const texture = target.material.uniforms[name] as Texture
      const compiled = this._textures.get(texture)!
      if (texture.needsUpdate) {
        compiled.update(texture)
        texture.needsUpdate = false
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

    if (target.material.transparent) {
      this.gl.enable(this.gl.BLEND)
      this.gl.blendFunc(this._params.premultipliedAlpha ? this.gl.ONE : this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    } else {
      this.gl.disable(this.gl.BLEND)
    }

    // Cleanup
    VAO.unbind()

    return { VAO, program, bufferAttributes }
  }

  /**
   * Compiles and binds a render target to render into.
   */
  setRenderTarget(renderTarget: RenderTarget | null) {
    if (!renderTarget) {
      this.setViewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height)
      return this.setFrameBuffer(null)
    }

    // Compile FBO
    if (!this._FBOs.has(renderTarget)) {
      // Init texture attachments
      const textures = renderTarget.textures.map((texture) => {
        if (!this._textures.has(texture)) {
          this._textures.set(texture, new WebGLTextureObject(this.gl))
        }

        const compiled = this._textures.get(texture)!
        if (texture.needsUpdate) {
          compiled.update(texture, renderTarget.width, renderTarget.height)
          texture.needsUpdate = false
        }

        return compiled
      })

      const FBO = new WebGLFBO(
        this.gl,
        renderTarget.width,
        renderTarget.height,
        renderTarget.count,
        renderTarget.samples,
        textures,
      )
      this._FBOs.set(renderTarget, FBO)
    }

    // Bind
    const compiled = this._FBOs.get(renderTarget)!
    compiled.bind()
    this.gl.viewport(0, 0, renderTarget.width, renderTarget.height)
  }

  /**
   * Downsamples a multi-sampled render target and its attachments to be readable via `blitFramebuffer`. Supports MRT.
   */
  blitRenderTarget(renderTarget: RenderTarget) {
    const compiled = this._FBOs.get(renderTarget)
    if (compiled) compiled.blit()
  }

  render(scene: Object3D, camera?: Camera) {
    // Clear screen
    if (this.autoClear) this.clear()

    // Update scene matrices
    if (scene.autoUpdate) scene.updateMatrix()

    // Update camera matrices
    if (camera?.autoUpdate && camera.parent === null) camera.updateMatrix()

    // Compile & render visible children
    const renderList = this.sort(scene, camera)
    for (const child of renderList) {
      // Compile on first render, otherwise update
      const { VAO } = this.compile(child, camera)

      // Bind
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
  }
}
