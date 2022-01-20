import { Renderer } from '../core/Renderer'
import type { Disposable } from '../utils'
import type { Uniform, Material } from '../core/Material'
import type { Geometry, GeometryAttribute } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Scene } from '../core/Scene'
import type { Camera } from '../core/Camera'
import { compiled, compareUniforms } from '../utils'
import { GL_SHADER_TEMPLATES, GL_CULL_SIDES, GL_DRAW_MODES } from '../constants'

export type WebGLAttribute = { buffer: WebGLBuffer; location: number }
export type WebGLAttributeMap = Map<string, WebGLAttribute>

export type WebGLMaterial = Disposable & { program: WebGLProgram; uniforms: Map<string, Uniform> }
export type WebGLGeometry = Disposable & { attributes: WebGLAttributeMap }

export type WebGLMesh = Disposable & { VAO: WebGLVertexArrayObject }

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
   * Whether to create a depth buffer to depth test with. Useful for shadows. Default is `false`.
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

  private _params: Partial<Omit<WebGLRendererOptions, 'canvas' | 'context'>>

  constructor({
    canvas = document.createElement('canvas'),
    context,
    alpha = true,
    antialias = false,
    depth = false,
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
   * Sets cull face mode. Useful for
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

  private setUniform(name: string, type: number, value: any, program: WebGLProgram) {
    const location = this.gl.getUniformLocation(program, name)

    switch (type) {
      case this.gl.FLOAT:
        value.length ? this.gl.uniform1fv(location, value) : this.gl.uniform1f(location, value)
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
        value.length ? this.gl.uniform1iv(location, value) : this.gl.uniform1i(location, value)
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

  private setAttribute(name: string, attribute: GeometryAttribute, program: WebGLProgram): WebGLAttribute {
    // Create attribute buffer
    const buffer = this.gl.createBuffer()!

    // Bind it
    const bufferType = name === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER
    this.gl.bindBuffer(bufferType, buffer)
    this.gl.bufferData(bufferType, attribute.data as unknown as BufferSource, this.gl.STATIC_DRAW)

    // Save attribute with pointer for VAO
    const location = this.gl.getAttribLocation(program, name)
    if (location !== -1) {
      this.gl.enableVertexAttribArray(location)
      this.gl.vertexAttribPointer(location, attribute.size, this.gl.FLOAT, false, 0, 0)
    }

    return { buffer, location }
  }

  private compileShaders(material: Material) {
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

  private updateUniforms(material: Material) {
    const { program, uniforms } = compiled.get(material.uuid)! as WebGLMaterial

    const uniformsLength = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformsLength; i++) {
      const { name, type } = this.gl.getActiveUniform(program, i)!
      const value = material.uniforms[name]
      if (value === undefined) throw `Uniform not found for ${name}!`

      const prevUniform = uniforms.get(name)!
      const needsUpdate = !compareUniforms(prevUniform, value)

      if (needsUpdate) this.setUniform(name, type, value, program)
      // @ts-expect-error
      if (prevUniform === undefined) uniforms.set(name, value?.clone() ?? value)
    }
  }

  private updateMaterial(material: Material) {
    let program: WebGLProgram

    // Compile program on first bind
    const compiledMaterial = compiled.get(material.uuid) as WebGLMaterial | undefined
    if (compiledMaterial) {
      program = compiledMaterial.program
    } else {
      // Create program and compile it
      program = this.gl.createProgram()!

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

      compiled.set(material.uuid, {
        program,
        uniforms: new Map(),
        dispose: () => {
          this.gl.deleteProgram(program)
        },
      } as WebGLMaterial)
    }

    // Bind program and update uniforms
    this.gl.useProgram(program)
    this.updateUniforms(material)

    // Update material state
    const { side, depthTest, depthWrite, transparent } = material

    this.setCullFace(GL_CULL_SIDES[side] ?? GL_CULL_SIDES.front)
    this.setDepthTest(depthTest)
    this.setDepthMask(depthWrite)

    if (transparent) {
      this.gl.enable(this.gl.BLEND)
      this.gl.blendFunc(this._params.premultipliedAlpha ? this.gl.ONE : this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    } else {
      this.gl.disable(this.gl.BLEND)
    }

    return program
  }

  private updateAttributes(geometry: Geometry) {
    const { attributes } = compiled.get(geometry.uuid)! as WebGLGeometry

    Object.entries(geometry.attributes).forEach(([name, attribute]) => {
      if (!attribute.needsUpdate) return

      const { buffer } = attributes.get(name)!

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
      this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, attribute.data as unknown as BufferSource)
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)

      geometry.attributes[name].needsUpdate = false
    })
  }

  private updateGeometry(geometry: Geometry, program: WebGLProgram) {
    // If compiled, only update attributes
    if (compiled.has(geometry.uuid)) return this.updateAttributes(geometry)

    // Otherwise, create and bind buffer attributes
    const attributes: WebGLAttributeMap = new Map()
    Object.entries(geometry.attributes).forEach(([name, attribute]) => {
      const { buffer, location } = this.setAttribute(name, attribute, program)
      attributes.set(name, { buffer, location })
    })

    compiled.set(geometry.uuid, {
      attributes,
      dispose: () => {
        attributes.forEach(({ location, buffer }) => {
          this.gl.disableVertexAttribArray(location)
          this.gl.deleteBuffer(buffer)
        })
      },
    } as WebGLGeometry)
  }

  private updateMesh(mesh: Mesh, camera?: Camera) {
    // Update built-ins
    mesh.material.uniforms.modelMatrix = mesh.worldMatrix

    if (camera) {
      mesh.material.uniforms.modelViewMatrix = mesh.modelViewMatrix
      mesh.material.uniforms.normalMatrix = mesh.normalMatrix
      mesh.material.uniforms.viewMatrix = camera.viewMatrix
      mesh.material.uniforms.projectionMatrix = camera.projectionMatrix
    }

    // Create VAO on first bind
    let VAO: WebGLVertexArrayObject

    const compiledMesh = compiled.get(mesh.uuid) as WebGLMesh | undefined
    if (compiledMesh) {
      VAO = compiledMesh.VAO
    } else {
      VAO = this.gl.createVertexArray()!

      compiled.set(mesh.uuid, {
        VAO,
        dispose: () => {
          this.gl.deleteVertexArray(VAO)
        },
      } as WebGLMesh)
    }

    // Bind
    this.gl.bindVertexArray(VAO)

    // Update material/geometry
    const program = this.updateMaterial(mesh.material)
    this.updateGeometry(mesh.geometry, program)
  }

  render(scene: Scene, camera?: Camera) {
    // Clear screen
    if (this.autoClear) {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
      this.gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearAlpha)
    }

    // Update camera matrices
    if (camera) camera.updateMatrix()
    if (camera?.needsUpdate) {
      camera.updateProjectionMatrix()
      camera.needsUpdate = false
    }

    // Render children
    const renderList = scene.children as Mesh[]
    renderList.forEach((mesh) => {
      mesh.updateMatrix(camera)

      // Don't render invisible objects
      // TODO: filter out occluded meshes
      if (!mesh.isMesh || !mesh.visible) return

      // Compile on first render, otherwise update
      this.updateMesh(mesh, camera)

      // Alternate drawing for indexed and non-indexed meshes
      const { index, position } = mesh.geometry.attributes
      const mode = GL_DRAW_MODES[mesh.mode] ?? GL_DRAW_MODES.triangles
      if (index) {
        this.gl.drawElements(mode, index.data.length / index.size, this.gl.UNSIGNED_SHORT, 0)
      } else {
        this.gl.drawArrays(mode, 0, position.data.length / position.size)
      }

      // Unbind
      this.gl.useProgram(null)
      this.gl.bindVertexArray(null)
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    })
  }
}
