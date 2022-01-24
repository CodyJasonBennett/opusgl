import { Renderer } from '../core/Renderer'
import type { Disposable } from '../utils'
import type { Uniform, Material } from '../core/Material'
import type { Geometry } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Object3D } from '../core/Object3D'
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

  /**
   * Sets a program's active uniform by name.
   */
  setUniform(name: string, value: any, program: WebGLProgram) {
    let uniform!: WebGLActiveInfo | null

    // Query for active uniform by name
    const uniformsLength = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformsLength; i++) {
      const activeUniform = this.gl.getActiveUniform(program, i)
      if (activeUniform?.name === name) uniform = activeUniform
    }

    // Don't set unused uniforms
    if (!uniform) return

    const location = this.gl.getUniformLocation(program, uniform.name)!
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

    return uniform
  }

  /**
   * Creates buffer and initializes it.
   */
  createBuffer(data: Float32Array | Uint16Array, type = this.gl.ARRAY_BUFFER, usage = this.gl.STATIC_DRAW) {
    const buffer = this.gl.createBuffer()!
    this.gl.bindBuffer(type, buffer)
    this.gl.bufferData(type, data, usage)

    return buffer
  }

  /**
   * Updates a buffer.
   */
  writeBuffer(buffer: WebGLBuffer, data: Float32Array | Uint16Array, type = this.gl.ARRAY_BUFFER) {
    this.gl.bindBuffer(type, buffer)
    this.gl.bufferSubData(type, 0, data)

    return buffer
  }

  /**
   * Compiles a material's vertex and fragment shaders.
   */
  compileShaders(material: Material) {
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
   * Sets or updates a material's program uniforms.
   */
  updateUniforms(material: Material) {
    const { program, uniforms } = compiled.get(material.uuid)! as WebGLMaterial

    Object.entries(material.uniforms).forEach(([name, value]) => {
      const prevUniform = uniforms.get(name)!
      const needsUpdate = !compareUniforms(prevUniform, value)

      if (needsUpdate) {
        this.setUniform(name, value, program)

        // @ts-expect-error
        uniforms.set(name, value?.clone() ?? value)
      }
    })

    return uniforms
  }

  /**
   * Compiles or updates a material's program, shaders, uniforms, and state.
   */
  compileMaterial(material: Material) {
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

  /**
   * Updates a geometry's buffer attributes.
   */
  updateAttributes(geometry: Geometry) {
    const { attributes } = compiled.get(geometry.uuid)! as WebGLGeometry

    Object.entries(geometry.attributes).forEach(([name, attribute]) => {
      if (!attribute.needsUpdate) return

      const { buffer } = attributes.get(name)!
      this.writeBuffer(buffer, attribute.data)
    })

    return attributes
  }

  /**
   * Compiles or updates a geometry's attributes and binds them to a program.
   */
  compileGeometry(geometry: Geometry, program: WebGLProgram) {
    // If compiled, only update attributes
    if (compiled.has(geometry.uuid)) return this.updateAttributes(geometry)

    // Otherwise, create and bind buffer attributes
    const attributes: WebGLAttributeMap = new Map()
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

    compiled.set(geometry.uuid, {
      attributes,
      dispose: () => {
        attributes.forEach(({ location, buffer }) => {
          this.gl.disableVertexAttribArray(location)
          this.gl.deleteBuffer(buffer)
        })
      },
    } as WebGLGeometry)

    return attributes
  }

  /**
   * Compiles or updates a mesh and its geometry & material.
   */
  compileMesh(mesh: Mesh, camera?: Camera) {
    // Update built-ins
    mesh.material.uniforms.modelMatrix = mesh.worldMatrix

    if (camera) {
      mesh.material.uniforms.modelViewMatrix = mesh.modelViewMatrix
      mesh.material.uniforms.normalMatrix = mesh.normalMatrix
      mesh.material.uniforms.viewMatrix = camera.viewMatrix
      mesh.material.uniforms.projectionMatrix = camera.projectionMatrix

      mesh.modelViewMatrix.copy(camera.viewMatrix).multiply(mesh.worldMatrix)
      mesh.normalMatrix.getNormalMatrix(mesh.modelViewMatrix)
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
    const program = this.compileMaterial(mesh.material)
    this.compileGeometry(mesh.geometry, program)

    // Unbind
    this.gl.bindVertexArray(null)

    return VAO
  }

  render(scene: Object3D, camera?: Camera) {
    // Clear screen
    if (this.autoClear) {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
      this.gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearAlpha)
    }

    // Update scene matrices
    scene.updateMatrix()

    // Update camera matrices
    if (camera) camera.updateMatrix()
    if (camera?.needsUpdate) {
      camera.updateProjectionMatrix()
      camera.needsUpdate = false
    }

    // Render children
    this.sort(scene, camera).forEach((mesh) => {
      // Compile on first render, otherwise update
      const VAO = this.compileMesh(mesh, camera)

      // Bind
      this.gl.bindVertexArray(VAO)

      // Alternate drawing for indexed and non-indexed meshes
      const { index, position } = mesh.geometry.attributes
      const mode = GL_DRAW_MODES[mesh.mode] ?? GL_DRAW_MODES.triangles
      if (index) {
        this.gl.drawElements(mode, index.data.length / index.size, this.gl.UNSIGNED_SHORT, 0)
      } else {
        this.gl.drawArrays(mode, 0, position.data.length / position.size)
      }

      // Unbind
      this.gl.bindVertexArray(null)
    })
  }
}
