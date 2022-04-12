import { Disposable, Compiled, Renderer } from '../core/Renderer'
import { Program } from '../core/Program'
import type { Uniform } from '../core/Program'
import type { Texture } from '../core/Texture'
import type { Material } from '../core/Material'
import type { Geometry } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Object3D } from '../core/Object3D'
import type { Camera } from '../core/Camera'
import {
  GL_SHADER_TEMPLATES,
  GL_TEXTURE_FILTERS,
  GL_TEXTURE_MIPMAP_FILTERS,
  GL_TEXTURE_WRAPPINGS,
  GL_CULL_SIDES,
  GL_DRAW_MODES,
} from '../constants'
import { std140 } from '../utils'

export type GLAttribute = { buffer: WebGLBuffer; location: number }
export type GLAttributeMap = Map<string, GLAttribute>

export interface GLCompiled extends Disposable {
  VAO: WebGLVertexArrayObject
  program: WebGLProgram
  UBO: {
    textures: Map<string, { target: WebGLTexture; index: number }>
    uniforms: Map<string, Uniform>
    data?: Float32Array
    buffer?: WebGLBuffer
  }
  attributes: Map<string, { buffer: WebGLBuffer; location: number }>
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
   * Whether to enable anti-aliasing for sharp corners. Default is `false` unless rendering at DPR <= 1.
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
  protected _compiled = new Compiled<GLCompiled>()

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
  setFrameBuffer(frameBuffer: WebGLFramebuffer | null) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer)
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

  /**
   * Creates buffer and initializes it.
   */
  createBuffer(data: Float32Array | Uint32Array, type = this.gl.ARRAY_BUFFER, usage = this.gl.STATIC_DRAW) {
    const buffer = this.gl.createBuffer()!
    this.gl.bindBuffer(type, buffer)
    this.gl.bufferData(type, data, usage)

    return buffer
  }

  /**
   * Updates a buffer.
   */
  writeBuffer(buffer: WebGLBuffer, data: Float32Array | Uint32Array, type = this.gl.ARRAY_BUFFER) {
    this.gl.bindBuffer(type, buffer)
    this.gl.bufferSubData(type, 0, data)

    return buffer
  }

  /**
   * Compiles a material's vertex and fragment shaders.
   */
  protected compileShaders(material: Material | Program) {
    const shaders = Object.entries(GL_SHADER_TEMPLATES).map(([name, template]) => {
      const type = name === 'vertex' ? this.gl.VERTEX_SHADER : this.gl.FRAGMENT_SHADER
      const shader = this.gl.createShader(type)!

      const source = material[name as keyof typeof GL_SHADER_TEMPLATES]
      this.gl.shaderSource(shader, template + source)

      this.gl.compileShader(shader)
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        const error = this.gl.getShaderInfoLog(shader)
        throw `Error compiling ${name} shader: ${error}`
      }

      return shader
    })

    return shaders
  }

  /**
   * Compiles and activates a texture by index.
   */
  protected updateTexture(target: WebGLTexture, texture: Texture, index: number) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, target)

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture.image)
    if (texture.flipY) this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, texture.flipY)

    const anisotropy = this.gl.getExtension('EXT_texture_filter_anisotropic')
    if (anisotropy) this.gl.texParameterf(this.gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, texture.anisotropy)
    if (texture.generateMipmaps) this.gl.generateMipmap(this.gl.TEXTURE_2D)

    const magFilter = GL_TEXTURE_FILTERS[texture.magFilter] ?? GL_TEXTURE_FILTERS.nearest
    const minFilters = texture.generateMipmaps ? GL_TEXTURE_MIPMAP_FILTERS : GL_TEXTURE_FILTERS
    const minFilter = minFilters[texture.minFilter] ?? minFilters.nearest
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter)

    const wrapS = GL_TEXTURE_WRAPPINGS[texture.wrapS] ?? GL_TEXTURE_WRAPPINGS.clamp
    const wrapT = GL_TEXTURE_WRAPPINGS[texture.wrapT] ?? GL_TEXTURE_WRAPPINGS.clamp
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, wrapS)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, wrapT)

    this.gl.activeTexture(this.gl.TEXTURE0 + index)
    this.gl.bindTexture(this.gl.TEXTURE_2D, target)
    texture.needsUpdate = false
  }

  /**
   * Sets or updates a material's program uniforms.
   */
  protected updateUniforms(material: Material | Program) {
    let UBO = this._compiled.get(material)?.UBO!

    if (!UBO) {
      UBO = { textures: new Map(), uniforms: new Map() }

      // Init textures outside of std140
      let index = 0
      for (const name in material.uniforms) {
        const texture = material.uniforms[name] as Texture
        if (texture?.isTexture) {
          const target = this.gl.createTexture()!
          this.updateTexture(target, texture, index)

          UBO.textures.set(name, { target, index })
          index++
        }
      }

      // Parse used uniforms for std140
      const parsed = this.parseUniforms(material.vertex, material.fragment)
      if (parsed) {
        // Init parsed uniforms
        for (const name of parsed) {
          const uniform = material.uniforms[name]
          UBO.uniforms.set(name, this.cloneUniform(uniform))
        }

        // Create UBO
        UBO.data = std140(Array.from(UBO.uniforms.values()))
        UBO.buffer = this.gl.createBuffer()!

        // Bind it
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, UBO.buffer)
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, UBO.buffer)
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, UBO.data.byteLength, this.gl.DYNAMIC_DRAW)
      }
    } else {
      // Update textures flagged for update
      UBO.textures.forEach((compiled, name) => {
        const texture = material.uniforms[name] as Texture
        if (!texture.needsUpdate) return

        this.updateTexture(compiled.target, texture, compiled.index)
      })

      // Check whether a uniform has changed
      let needsUpdate = false
      UBO.uniforms.forEach((value, name) => {
        const uniform = material.uniforms[name]
        if (this.uniformsEqual(value, uniform)) return

        UBO.uniforms.set(name, this.cloneUniform(uniform))
        needsUpdate = true
      })

      if (needsUpdate) {
        // If a uniform changed, rebuild entire buffer
        // TODO: expand writeBuffer to subdata at affected indices instead
        this.writeBuffer(UBO.buffer!, std140(Array.from(UBO.uniforms.values()), UBO.data), this.gl.UNIFORM_BUFFER)
      }
    }

    return UBO
  }

  /**
   * Compiles or updates a material's program, shaders, uniforms, and state.
   */
  protected compileMaterial(target: Mesh | Program) {
    const material = target instanceof Program ? target : target.material

    // Compile program on first bind
    const compiledMaterial = this._compiled.get(material)
    const program = compiledMaterial?.program ?? this.gl.createProgram()!

    if (!compiledMaterial) {
      // Compile shaders and attach them
      const shaders = this.compileShaders(material)
      shaders.forEach((shader) => {
        this.gl.attachShader(program, shader)
      })

      this.gl.linkProgram(program)
      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        const error = this.gl.getProgramInfoLog(program)
        throw `Error creating program: ${error}`
      }

      // Cleanup shaders
      shaders.forEach((shader) => {
        this.gl.detachShader(program, shader)
        this.gl.deleteShader(shader)
      })
    }

    // Bind program and update uniforms
    this.gl.useProgram(program)
    const UBO = this.updateUniforms(material)

    // Update material state
    this.setCullFace(GL_CULL_SIDES[material.side] ?? GL_CULL_SIDES.front)
    this.setDepthTest(material.depthTest)
    this.setDepthMask(material.depthWrite)

    if (material.transparent) {
      this.gl.enable(this.gl.BLEND)
      this.gl.blendFunc(this._params.premultipliedAlpha ? this.gl.ONE : this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    } else {
      this.gl.disable(this.gl.BLEND)
    }

    if (!compiledMaterial && !(target instanceof Program)) {
      this._compiled.set(material, {
        program,
        UBO,
        dispose: () => {
          this.gl.deleteProgram(program)

          if (UBO.buffer) this.gl.deleteBuffer(UBO.buffer)
          UBO.textures.forEach(({ target }) => {
            this.gl.deleteTexture(target)
          })
        },
      } as GLCompiled)
    }

    return { program, UBO }
  }

  /**
   * Updates a geometry's buffer attributes.
   */
  protected updateAttributes(geometry: Geometry | Program) {
    const { attributes } = this._compiled.get(geometry)!

    attributes.forEach((compiled, name) => {
      const attribute = geometry.attributes[name]
      if (!attribute.needsUpdate) return

      this.writeBuffer(compiled.buffer, attribute.data)
    })

    return attributes
  }

  /**
   * Compiles or updates a geometry's attributes and binds them to a program.
   */
  protected compileGeometry(target: Mesh | Program, program: WebGLProgram) {
    const geometry = target instanceof Program ? target : target.geometry
    if (this._compiled.has(geometry)) return this.updateAttributes(geometry)

    // Otherwise, create and bind buffer attributes
    const attributes: GLAttributeMap = new Map()
    Object.entries(geometry.attributes).forEach(([name, attribute]) => {
      // Create buffer
      const type = name === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER
      const buffer = this.createBuffer(attribute.data, type)

      // Save attribute with pointer for VAO
      const location = this.gl.getAttribLocation(program, name)
      if (location !== -1) {
        this.gl.enableVertexAttribArray(location)
        this.gl.vertexAttribPointer(location, attribute.size, this.gl.FLOAT, false, 0, 0)
      }

      attributes.set(name, { buffer, location })
    })

    if (!(target instanceof Program)) {
      this._compiled.set(geometry, {
        attributes,
        dispose: () => {
          attributes.forEach(({ location, buffer }) => {
            this.gl.disableVertexAttribArray(location)
            this.gl.deleteBuffer(buffer)
          })
        },
      } as GLCompiled)
    }

    return attributes
  }

  compile(target: Mesh | Program, camera?: Camera) {
    const isProgram = target instanceof Program

    // Update mesh built-ins
    if (!isProgram) {
      target.material.uniforms.modelMatrix = target.worldMatrix

      if (camera) {
        target.material.uniforms.projectionMatrix = camera.projectionMatrix
        target.material.uniforms.viewMatrix = camera.viewMatrix
        target.material.uniforms.normalMatrix = target.normalMatrix

        target.modelViewMatrix.copy(camera.viewMatrix).multiply(target.worldMatrix)
        target.normalMatrix.getNormalMatrix(target.modelViewMatrix)
      }
    }

    // Create VAO on first bind
    const compiled = this._compiled.get(target)
    const VAO = compiled?.VAO ?? this.gl.createVertexArray()!

    // Bind
    this.gl.bindVertexArray(VAO)

    // Update shaders, uniforms, attributes
    const { program, UBO } = this.compileMaterial(target)
    const attributes = this.compileGeometry(target, program)

    // Unbind
    this.gl.bindVertexArray(null)

    if (!compiled) {
      this._compiled.set(target, {
        VAO,
        program,
        UBO,
        attributes,
        dispose: () => {
          this.gl.deleteVertexArray(VAO)
        },
      })
    }

    return this._compiled.get(target)!
  }

  render(scene: Object3D | Program, camera?: Camera) {
    // Clear screen
    if (this.autoClear) this.clear()

    // Update scene matrices
    if (!(scene instanceof Program) && scene.matrixAutoUpdate) scene.updateMatrix()

    // Update camera matrices
    if (camera?.matrixAutoUpdate) camera.updateMatrix()

    // Compile & render visible children
    const renderList = scene instanceof Program ? [scene] : this.sort(scene, camera)
    for (const child of renderList) {
      // Compile on first render, otherwise update
      const { VAO } = this.compile(child, camera)

      // Bind
      this.gl.bindVertexArray(VAO)

      // Alternate drawing for indexed and non-indexed children
      const { index, position } = child instanceof Program ? child.attributes : child.geometry.attributes
      const mode = GL_DRAW_MODES[child.mode] ?? GL_DRAW_MODES.triangles
      if (index) {
        this.gl.drawElements(mode, index.data.length / index.size, this.gl.UNSIGNED_INT, 0)
      } else {
        this.gl.drawArrays(mode, 0, position.data.length / position.size)
      }

      // Unbind
      this.gl.bindVertexArray(null)
    }
  }
}
