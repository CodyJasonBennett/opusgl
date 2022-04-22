import { type Disposable, Compiled, Renderer } from '../core/Renderer'
import { Program, type Uniform } from '../core/Program'
import { Texture, type TextureOptions } from '../core/Texture'
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
  private _init = false

  constructor(gl: WebGL2RenderingContext, type = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) {
    this.gl = gl
    this.buffer = this.gl.createBuffer()!
    this.type = type
    this.usage = usage
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
   * Binds the buffer at an index. Useful for transform feedback and uniform buffers.
   */
  setIndex(index: number) {
    this.gl.bindBufferBase(this.type, index, this.buffer)
    this.bind()
  }

  /**
   * Writes binary data to buffer or sets buffer length.
   */
  write(data: Float32Array | Uint32Array | number) {
    this.bind()

    if (!this._init) {
      if (typeof data === 'number') {
        this.gl.bufferData(this.type, data, this.usage)
      } else {
        this.gl.bufferData(this.type, data, this.usage)
      }

      this._init = true
    } else if (typeof data !== 'number') {
      this.gl.bufferSubData(this.type, 0, data)
    }
  }

  /**
   * Disposes the VAO from GPU memory.
   */
  dispose() {
    this.gl.deleteBuffer(this.buffer)
  }
}

/**
 * Constructs a WebGL program. Manages active textures and uniforms.
 */
export class WebGLProgramObject {
  readonly gl: WebGL2RenderingContext
  readonly program: WebGLProgram
  readonly textures = new Map<string, { texture: WebGLTextureObject; location: number }>()
  readonly UBOs = new Map<number, { data: Float32Array; buffer: WebGLBufferObject; uniforms: Map<string, Uniform> }>()

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
    return this.textures.get(name)?.location ?? -1
  }

  /**
   * Binds and activates a texture by name and location.
   */
  activateTexture(name: string, texture: WebGLTextureObject, location: number) {
    this.textures.set(name, { texture, location })
    this.gl.activeTexture(this.gl.TEXTURE0 + location)
    texture.bind()
  }

  /**
   * Sets a uniform outside of std140 by name.
   */
  setUniform(name: string, value: any) {
    let uniform!: WebGLActiveInfo | null

    // Query for active uniform by name
    const uniformsLength = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformsLength; i++) {
      const activeUniform = this.gl.getActiveUniform(this.program, i)
      if (activeUniform?.name === name) uniform = activeUniform
    }

    const location = this.getUniformLocation(name)

    // Set uniform if active
    if (uniform) {
      switch (uniform.type) {
        case this.gl.FLOAT:
          value?.length ? this.gl.uniform1fv(location, value) : this.gl.uniform1f(location, value)
          break
        case this.gl.FLOAT_VEC2:
          this.gl.uniform2fv(location, value)
          break
        case this.gl.FLOAT_VEC3:
          this.gl.uniform3fv(location, value)
          break
        case this.gl.FLOAT_VEC4:
          this.gl.uniform4fv(location, value)
          break
        case this.gl.BOOL:
        case this.gl.INT:
        case this.gl.SAMPLER_2D:
        case this.gl.SAMPLER_CUBE:
          value?.length ? this.gl.uniform1iv(location, value) : this.gl.uniform1i(location, value)
          break
        case this.gl.BOOL_VEC2:
        case this.gl.INT_VEC2:
          this.gl.uniform2iv(location, value)
          break
        case this.gl.BOOL_VEC3:
        case this.gl.INT_VEC3:
          this.gl.uniform3iv(location, value)
          break
        case this.gl.BOOL_VEC4:
        case this.gl.INT_VEC4:
          this.gl.uniform4iv(location, value)
          break
        case this.gl.FLOAT_MAT2:
          this.gl.uniformMatrix2fv(location, false, value)
          break
        case this.gl.FLOAT_MAT3:
          this.gl.uniformMatrix3fv(location, false, value)
          break
        case this.gl.FLOAT_MAT4:
          this.gl.uniformMatrix4fv(location, false, value)
          break
      }
    }

    return { uniform, location }
  }

  /**
   * Compiles uniforms at an optional index into a uniform buffer.
   */
  compileUniforms(uniforms: Program['uniforms'], index = 0) {
    const memoizedUniforms = new Map()
    for (const name in uniforms) {
      const uniform = uniforms[name]
      memoizedUniforms.set(name, cloneUniform(uniform))
    }

    const data = std140(Array.from(memoizedUniforms.values()))
    const buffer = new WebGLBufferObject(this.gl, this.gl.UNIFORM_BUFFER, this.gl.DYNAMIC_DRAW)
    buffer.setIndex(index)
    buffer.write(data.byteLength)

    this.UBOs.set(index, { data, buffer, uniforms: memoizedUniforms })
  }

  /**
   * Updates changed uniforms in a uniform buffer by an optional index.
   */
  updateUniforms(uniforms: Program['uniforms'], index = 0) {
    const UBO = this.UBOs.get(index)
    if (!UBO) return

    // Check whether a uniform has changed
    let needsUpdate = false
    UBO.uniforms.forEach((value, name) => {
      const uniform = uniforms[name]
      if (uniformsEqual(value, uniform)) return

      UBO.uniforms.set(name, cloneUniform(uniform))
      needsUpdate = true
    })

    if (needsUpdate) {
      // If a uniform changed, rebuild entire buffer
      // TODO: expand write to subdata at affected indices instead
      UBO.buffer.write(std140(Array.from(UBO.uniforms.values()), UBO.data))
    }
  }

  /**
   * Disposes the program from GPU memory.
   */
  dispose() {
    this.UBOs.forEach(({ buffer }) => buffer.dispose())
    this.gl.deleteProgram(this.program)
  }
}

/**
 * Constructs a WebGL buffer attribute manager.
 */
export class WebGLBufferAttributes {
  readonly gl: WebGL2RenderingContext
  readonly program: WebGLProgramObject
  readonly attributes = new Map<string, { buffer: WebGLBufferObject; location: number }>()

  constructor(gl: WebGL2RenderingContext, program: WebGLProgramObject) {
    this.gl = gl
    this.program = program
  }

  /**
   * Compiles and binds program attributes into buffers.
   */
  compileAttributes(attributes: Program['attributes']) {
    for (const name in attributes) {
      const attribute = attributes[name]
      attribute.needsUpdate = false

      const type = name === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER
      const buffer = new WebGLBufferObject(this.gl, type)
      buffer.write(attribute.data)

      const location = this.program.getAttributeLocation(name)
      if (location !== -1) {
        this.gl.enableVertexAttribArray(location)
        this.gl.vertexAttribPointer(location, attribute.size, this.gl.FLOAT, false, 0, 0)
      }

      this.attributes.set(name, { buffer, location })
    }
  }

  /**
   * Updates program attributes flagged for update.
   */
  updateAttributes(attributes: Program['attributes']) {
    this.attributes.forEach(({ buffer }, name) => {
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
    this.attributes.forEach(({ buffer, location }) => {
      buffer.dispose()
      if (location !== -1) this.gl.disableVertexAttribArray(location)
    })
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
  readonly textures: WebGLTextureObject[]
  readonly renderBuffers: WebGLRenderbuffer[]
  readonly frameBuffer: WebGLFramebuffer

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
  bind(type = this.gl.FRAMEBUFFER) {
    this.gl.bindFramebuffer(type, this.frameBuffer)
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
    // so we create temporary FBOs and copy renderBuffers to textures one by one
    // (See issue #12): https://www.khronos.org/registry/OpenGL/extensions/EXT/EXT_framebuffer_blit.txt
    const read = this.gl.createFramebuffer()
    const write = this.gl.createFramebuffer()

    // Blit multi-sampled renderBuffers to textures
    for (const [i, renderBuffer] of this.renderBuffers.entries()) {
      const texture = this.textures[i]

      this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, read)
      this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, write)

      this.gl.framebufferRenderbuffer(
        this.gl.READ_FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.RENDERBUFFER,
        renderBuffer,
      )
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

      this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, null)
      this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null)
    }

    // Bind downsampled texture attachments
    this.bind()
    for (let i = 0; i < this.count; i++) {
      const texture = this.textures[i]
      this.gl.framebufferTexture2D(
        this.gl.DRAW_FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0 + i,
        this.gl.TEXTURE_2D,
        texture.target,
        0,
      )
    }

    this.gl.deleteFramebuffer(read)
    this.gl.deleteFramebuffer(write)
  }

  /**
   * Disposes of the FBO from GPU memory.
   */
  dispose() {
    this.gl.deleteFramebuffer(this.frameBuffer)
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
      this.gl.enable(this.gl.DEPTH_TEST)
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

  compile(target: Mesh | Program, camera?: Camera) {
    const isProgram = target instanceof Program

    const material = isProgram ? target : target.material
    const geometry = isProgram ? target : target.geometry

    // Update mesh built-ins
    if (!isProgram) {
      target.material.uniforms.modelMatrix = target.matrix

      if (camera) {
        target.material.uniforms.projectionMatrix = camera.projectionMatrix
        target.material.uniforms.viewMatrix = camera.viewMatrix
        target.material.uniforms.normalMatrix = target.normalMatrix

        target.modelViewMatrix.copy(camera.viewMatrix).multiply(target.matrix)
        target.normalMatrix.getNormalMatrix(target.modelViewMatrix)
      }
    }

    // Compile mesh VAO
    if (!this._VAOs.has(target)) {
      this._VAOs.set(target, new WebGLVAO(this.gl))
    }

    // Bind VAO to memoize further gl state
    const VAO = this._VAOs.get(target)!
    VAO.bind()

    // Compile program
    if (!this._programs.has(material)) {
      const program = new WebGLProgramObject(this.gl, material.vertex, material.fragment)
      this._programs.set(material, program)

      // Parse used uniforms
      const parsed = parseUniforms(material.vertex, material.fragment)

      // Set std140 uniforms
      if (parsed) {
        const uniforms = parsed?.reduce((acc, key) => ({ ...acc, [key]: material.uniforms[key] }), {})
        program.compileUniforms(uniforms)
      }

      // Set texture uniform samplers outside of std140
      let textureIndex = 0
      for (const name in material.uniforms) {
        const uniform = material.uniforms[name]

        if (uniform instanceof Texture) {
          program.setUniform(name, textureIndex)

          if (!this._textures.has(uniform)) {
            this._textures.set(uniform, new WebGLTextureObject(this.gl))
          }

          const compiled = this._textures.get(uniform)!
          program.activateTexture(name, compiled, textureIndex)
          textureIndex++
        }
      }
    }

    // Update uniforms
    const program = this._programs.get(material)!
    program.updateUniforms(material.uniforms)

    // Update textures outside of std140
    program.textures.forEach((compiled, name) => {
      const texture = material.uniforms[name] as Texture
      if (texture.needsUpdate) {
        compiled.texture.update(texture)
        texture.needsUpdate = false
      }
    })

    // If program was invalidated, recompile buffer attributes
    const prevBufferAttributes = this._bufferAttributes.get(geometry)
    if (prevBufferAttributes && prevBufferAttributes.program !== program) {
      prevBufferAttributes.dispose()
    }

    // Compile buffer attributes
    if (!this._bufferAttributes.has(geometry)) {
      const bufferAttributes = new WebGLBufferAttributes(this.gl, program)
      this._bufferAttributes.set(geometry, bufferAttributes)

      bufferAttributes.compileAttributes(geometry.attributes)
    }

    // Update buffer attributes
    const bufferAttributes = this._bufferAttributes.get(geometry)!
    bufferAttributes.updateAttributes(geometry.attributes)

    // Update material state
    this.setCullFace(GL_CULL_SIDES[material.side])
    this.setDepthTest(material.depthTest)
    this.setDepthMask(material.depthWrite)

    if (material.transparent) {
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

  render(scene: Object3D | Program, camera?: Camera) {
    // Clear screen
    if (this.autoClear) this.clear()

    // Update scene matrices
    if (!(scene instanceof Program)) scene.updateMatrix()

    // Update camera matrices
    if (camera) camera.updateMatrix()

    // Compile & render visible children
    const renderList = scene instanceof Program ? [scene] : this.sort(scene, camera)
    for (const child of renderList) {
      // Compile on first render, otherwise update
      const { VAO } = this.compile(child, camera)

      // Bind
      VAO.bind()

      // Alternate drawing for indexed and non-indexed children
      const { index, position } = child instanceof Program ? child.attributes : child.geometry.attributes
      const mode = GL_DRAW_MODES[child.mode]
      if (index) {
        this.gl.drawElements(mode, index.data.length / index.size, this.gl.UNSIGNED_INT, 0)
      } else {
        this.gl.drawArrays(mode, 0, position.data.length / position.size)
      }

      // Unbind
      VAO.unbind()
    }
  }
}
