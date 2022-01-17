import { Color } from '../math/Color'
import type { GeometryAttribute } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Scene } from '../core/Scene'
import type { Camera } from '../core/Camera'
import { GL_SHADER_TEMPLATES, GL_CULL_SIDES, GL_DRAW_MODES } from '../constants'

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

interface CompiledMesh {
  shaders: Map<string, WebGLShader>
  uniforms: Map<string, { value: any; location: WebGLUniformLocation }>
  attributes: Map<string, { buffer: WebGLBuffer; location: number }>
  VAO: WebGLVertexArrayObject
  program: WebGLProgram
}

export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement
  readonly gl: WebGL2RenderingContext
  public autoClear = true
  public clearColor = new Color(1, 1, 1)
  public clearAlpha = 0

  private _params: Partial<Omit<WebGLRendererOptions, 'canvas' | 'context'>>
  private _pixelRatio = 1
  private _viewport!: { x: number; y: number; width: number; height: number }
  private _scissor!: { x: number; y: number; width: number; height: number }

  private _compiled = new Map<Mesh['id'], CompiledMesh>()

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

  setSize(width: number, height: number) {
    this.canvas.width = Math.floor(width * this._pixelRatio)
    this.canvas.height = Math.floor(height * this._pixelRatio)

    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    this.setViewport(0, 0, width, height)
    this.setScissor(0, 0, width, height)
  }

  get pixelRatio() {
    return this._pixelRatio
  }

  setPixelRatio(pixelRatio: number | number[]) {
    if (Array.isArray(pixelRatio)) {
      const [min, max] = pixelRatio
      this._pixelRatio = Math.min(Math.max(min, window.devicePixelRatio), max)
    } else {
      this._pixelRatio = pixelRatio
    }

    this.setSize(this._viewport.width, this._viewport.height)
  }

  get viewport() {
    return this._viewport
  }

  setViewport(x: number, y: number, width: number, height: number) {
    const scaledWidth = Math.floor(width * this._pixelRatio)
    const scaledHeight = Math.floor(height * this._pixelRatio)

    this.gl.viewport(x, y, scaledWidth, scaledHeight)
    this._viewport = { x, y, width, height }
  }

  get scissor() {
    return this._scissor
  }

  setScissor(x: number, y: number, width: number, height: number) {
    this.gl.scissor(x, y, width, height)
    this._scissor = { x, y, width, height }
  }

  setScissorTest(enabled: boolean) {
    if (enabled) {
      this.gl.enable(this.gl.SCISSOR_TEST)
    } else {
      this.gl.disable(this.gl.SCISSOR_TEST)
    }
  }

  setCullFace(side: keyof typeof GL_CULL_SIDES) {
    const cullMode = GL_CULL_SIDES[side] ?? GL_CULL_SIDES.back
    if (cullMode) {
      this.gl.enable(this.gl.CULL_FACE)
      this.gl.cullFace(cullMode)
    } else {
      this.gl.disable(this.gl.CULL_FACE)
    }
  }

  setDepthTest(enabled: boolean) {
    if (enabled) {
      this.gl.enable(this.gl.DEPTH_TEST)
    } else {
      this.gl.enable(this.gl.DEPTH_TEST)
    }
  }

  setDepthMask(enabled: boolean) {
    this.gl.depthMask(enabled)
  }

  private compileShader(name: 'vertex' | 'fragment', source: string) {
    const type = name === 'vertex' ? this.gl.VERTEX_SHADER : this.gl.FRAGMENT_SHADER
    const shader = this.gl.createShader(type)!

    const template = GL_SHADER_TEMPLATES[name]
    this.gl.shaderSource(shader, template + source)

    this.gl.compileShader(shader)
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader)
      throw `Error compiling ${name} shader: ${error}`
    }

    return shader
  }

  private compileProgram(shaders: CompiledMesh['shaders']) {
    const program = this.gl.createProgram()!

    shaders.forEach((shader) => {
      this.gl.attachShader(program, shader)
    })

    this.gl.linkProgram(program)
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program)
      throw `Error creating program: ${error}`
    }

    return program
  }

  private setUniform(name: string, type: number, value: any, program: CompiledMesh['program']) {
    const location = this.gl.getUniformLocation(program, name)!

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

    return { location }
  }

  private setAttribute(name: string, attribute: GeometryAttribute, program: CompiledMesh['program']) {
    // Create attribute buffer
    const buffer = this.gl.createBuffer()

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

  private compileMesh(mesh: Mesh, camera?: Camera) {
    const shaders = new Map()
    const uniforms = new Map()
    const attributes = new Map()

    // Create VAO. This will let us bind the mesh in a single call
    const VAO = this.gl.createVertexArray()!
    this.gl.bindVertexArray(VAO)

    // Compile shaders
    const vertexShader = this.compileShader('vertex', mesh.material.vertex)
    shaders.set('vertex', vertexShader)

    const fragmentShader = this.compileShader('fragment', mesh.material.fragment)
    shaders.set('fragment', fragmentShader)

    // Create program and compile it
    const program = this.compileProgram(shaders)
    this.gl.useProgram(program)

    // Add built-ins
    mesh.material.uniforms.modelMatrix = mesh.modelMatrix
    mesh.material.uniforms.normalMatrix = mesh.normalMatrix

    if (camera) {
      mesh.material.uniforms.modelViewMatrix = mesh.modelViewMatrix
      mesh.material.uniforms.projectionMatrix = camera.projectionMatrix
    }

    // Allocate and set geometry attributes
    Object.entries(mesh.geometry.attributes).forEach(([name, attribute]) => {
      const { buffer, location } = this.setAttribute(name, attribute, program)
      attributes.set(name, { buffer, location })
    })

    // Save compiled mesh
    this._compiled.set(mesh.id, {
      shaders,
      uniforms,
      attributes,
      VAO,
      program,
    })

    // Cleanup
    this.gl.bindVertexArray(null)
    this.gl.useProgram(null)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
  }

  private updateUniforms(child: Mesh, compiled: CompiledMesh) {
    const uniformsLength = this.gl.getProgramParameter(compiled.program, this.gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformsLength; i++) {
      const { name, type } = this.gl.getActiveUniform(compiled.program, i)!
      const value = child.material.uniforms[name]
      if (value === undefined) throw `Uniform not found for ${name}!`

      // TODO: automatically flag for updates in material w/setters
      const { location } = this.setUniform(name, type, value, compiled.program)
      compiled.uniforms.set(name, { value, location })
    }
  }

  private updateAttributes(child: Mesh, compiled: CompiledMesh) {
    Object.entries(child.geometry.attributes).forEach(([name, attribute]) => {
      // TODO: automatically flag for updates in material w/setters
      if (!attribute.needsUpdate) return

      const { buffer } = compiled.attributes.get(name)!

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
      this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, attribute.data as unknown as BufferSource)
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)

      child.geometry.attributes[name].needsUpdate = false
    })
  }

  render(scene: Scene, camera?: Camera) {
    // Clear screen
    if (this.autoClear) {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
      this.gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearAlpha)
    }

    // Update camera matrices
    if (camera) camera.updateMatrixWorld()
    if (camera?.needsUpdate) {
      camera.updateProjectionMatrix()
      camera.needsUpdate = false
    }

    // Render children
    const renderList = scene.children as Mesh[]
    renderList.forEach((child) => {
      child.updateMatrixWorld()

      // Don't render invisible objects
      // TODO: filter out occluded meshes
      if (!child.isMesh || !child.visible) return

      // Compile on first render
      const isCompiled = this._compiled.has(child.id)
      if (!isCompiled) this.compileMesh(child, camera)

      // Bind
      const compiled = this._compiled.get(child.id)!
      this.gl.useProgram(compiled.program)
      this.gl.bindVertexArray(compiled.VAO)

      // Update camera built-ins
      if (camera) child.modelViewMatrix.multiply(camera.inverseMatrix)

      // Update program uniforms and attributes
      this.updateUniforms(child, compiled)
      this.updateAttributes(child, compiled)

      // Update material state
      const { side, depthTest, depthWrite, transparent } = child.material

      this.setCullFace(side)
      this.setDepthTest(depthTest)
      this.setDepthMask(depthWrite)

      if (transparent) {
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(
          this._params.premultipliedAlpha ? this.gl.ONE : this.gl.SRC_ALPHA,
          this.gl.ONE_MINUS_SRC_ALPHA,
        )
      } else {
        this.gl.disable(this.gl.BLEND)
      }

      // Alternate drawing for indexed and non-indexed meshes
      const { index, position } = child.geometry.attributes
      const mode = GL_DRAW_MODES[child.mode] ?? GL_DRAW_MODES.triangles
      if (index) {
        this.gl.drawElements(mode, index.data.length / index.size, this.gl.UNSIGNED_SHORT, 0)
      } else {
        this.gl.drawArrays(mode, 0, position.data.length / position.size)
      }

      // Unbind
      this.gl.useProgram(null)
      this.gl.bindVertexArray(null)
    })
  }

  dispose() {
    this._compiled.forEach((compiled) => {
      compiled.attributes.forEach(({ location, buffer }) => {
        this.gl.disableVertexAttribArray(location)
        this.gl.deleteBuffer(buffer)
      })

      compiled.shaders.forEach((shader) => {
        this.gl.detachShader(compiled.program, shader)
      })

      this.gl.deleteProgram(compiled.program)
      this.gl.deleteVertexArray(compiled.VAO)
    })
    this._compiled.clear()
  }
}
