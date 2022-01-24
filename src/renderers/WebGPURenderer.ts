import { Matrix4 } from '../math/Matrix4'
import { Renderer } from '../core/Renderer'
import type { Disposable } from '../utils'
import type { Uniform, Material } from '../core/Material'
import type { Geometry } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Object3D } from '../core/Object3D'
import type { Camera } from '../core/Camera'
import { compiled, compareUniforms } from '../utils'
import { GPU_CULL_SIDES, GPU_DRAW_MODES } from '../constants'

export type WebGPUUniform = GPUBindGroupEntry & { resource: { buffer: GPUBuffer; value?: Uniform } }
export type WebGPUUniformMap = Map<string, WebGPUUniform>
export type WebGPUMaterial = Disposable & { uniforms: WebGPUUniformMap; uniformBindGroup: GPUBindGroup }

export type WebGPUAttributeMap = Map<string, { buffer: GPUBuffer; slot: number }>
export type WebGPUGeometry = Disposable & { attributes: WebGPUAttributeMap }

export type WebGPUMesh = Disposable & GPURenderPipelineDescriptor & { pipeline: GPURenderPipeline }

// Converts WebGL NDC space (-1 to 1) to WebGPU (0 to 1, normalized)
const NDCConversionMatrix = new Matrix4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.5, 0.5, 0, 0, 0, 1)

export interface WebGPURendererOptions {
  /**
   * An optional canvas element to draw to.
   */
  canvas: HTMLCanvasElement
  /**
   * An optional WebGPU context to draw with.
   */
  context: GPUCanvasContext
  /**
   * Whether to enable antialiasing. Creates a multisampled rendertarget under the hood. Default is `true`.
   */
  antialias: boolean
  /**
   * Whether to prioritize rendering performance or power efficiency.
   */
  powerPreference: 'high-performance' | 'low-power'
  /**
   * Will fail device initialization if a feature is not met.
   */
  requiredFeatures: Iterable<GPUFeatureName>
  /**
   * Will fail device initialization if a limit is not met.
   */
  requiredLimits: Record<string, GPUSize64>
}

export class WebGPURenderer extends Renderer {
  public gl!: GPUCanvasContext

  private _params: Partial<Omit<WebGPURendererOptions, 'canvas'>>
  private _adapter!: GPUAdapter
  private _device!: GPUDevice
  private _presentationFormat!: GPUTextureFormat
  private _colorTexture!: GPUTexture
  private _colorTextureView!: GPUTextureView
  private _depthTexture!: GPUTexture
  private _depthTextureView!: GPUTextureView

  constructor({
    canvas = document.createElement('canvas'),
    antialias = true,
    powerPreference,
    requiredFeatures,
    requiredLimits,
  }: Partial<WebGPURendererOptions> = {}) {
    super()
    this.canvas = canvas
    this._params = {
      antialias,
      powerPreference,
      requiredFeatures,
      requiredLimits,
    }

    this.setSize(canvas.width, canvas.height)
  }

  /**
   * Initializes the internal WebGPU context and swapchain.
   */
  async init() {
    // Check for compatibility
    const isSupported = typeof window !== 'undefined' && 'gpu' in navigator
    if (!isSupported) throw 'WebGPU is not supported on this device!'

    // Init API
    this._adapter = (await navigator.gpu.requestAdapter(this._params))!
    this._device = await this._adapter.requestDevice(this._params)

    // Init GL
    this.gl = this._params.context ?? this.canvas.getContext('webgpu')!
    this._presentationFormat = this.gl.getPreferredFormat(this._adapter)
    this.gl.configure({
      device: this._device,
      format: this._presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    })

    // Render texture params
    const size = [this.viewport.width, this.viewport.height, 1]
    const sampleCount = this._params.antialias ? 4 : undefined
    const usage = GPUTextureUsage.RENDER_ATTACHMENT

    // Init multisampled color target for anti-aliasing
    if (this._params.antialias) {
      this._colorTexture = this._device.createTexture({
        format: this._presentationFormat,
        size,
        usage,
        sampleCount,
      })

      this._colorTextureView = this._colorTexture.createView()
    }

    // Init depth
    this._depthTexture = this._device.createTexture({
      dimension: '2d',
      format: 'depth24plus-stencil8',
      size,
      usage: usage | GPUTextureUsage.COPY_SRC,
      sampleCount,
    })
    this._depthTextureView = this._depthTexture.createView()

    return this
  }

  /**
   * Creates buffer and initializes it.
   */
  createBuffer(data: Uint16Array | Float32Array, usage: GPUBufferUsageFlags) {
    const buffer = this._device.createBuffer({
      size: (data.byteLength + 3) & ~3, // align to 4 bytes
      usage: usage | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    })

    // Map packed buffer
    const ArrayView = data instanceof Uint16Array ? Uint16Array : Float32Array
    new ArrayView(buffer.getMappedRange()).set(data)
    buffer.unmap()

    return buffer
  }

  /**
   * Updates a buffer.
   */
  writeBuffer(buffer: GPUBuffer, data: Uint16Array | Float32Array) {
    this._device.queue.writeBuffer(buffer, 0, data)
    return buffer
  }

  /**
   * Compiles a material's vertex and fragment shaders.
   */
  compileShaders(mesh: Mesh) {
    const vertex: GPUVertexState = {
      module: this._device.createShaderModule({
        code: mesh.material.vertex,
      }),
      entryPoint: 'main',
    }

    const fragment: GPUFragmentState = {
      module: this._device.createShaderModule({
        code: mesh.material.fragment,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: this._presentationFormat,
          blend: mesh.material.transparent
            ? {
                alpha: {
                  srcFactor: 'one',
                  dstFactor: 'one-minus-src-alpha',
                  operation: 'add',
                },
                color: {
                  srcFactor: 'src-alpha',
                  dstFactor: 'one-minus-src-alpha',
                  operation: 'add',
                },
              }
            : undefined,
          writeMask: 0xf,
        },
      ],
    }

    return { vertex, fragment }
  }

  /**
   * Compiles or updates a material's program, shaders, uniforms, and state.
   */
  compileMaterial(material: Material, pipeline: GPURenderPipeline) {
    // Create uniform layout on first run, otherwise update uniforms
    const compiledMaterial = compiled.get(material.uuid) as WebGPUMaterial | undefined
    if (!compiledMaterial) {
      // Create uniform buffers to bind
      const uniforms: WebGPUUniformMap = Object.entries(material.uniforms).reduce((acc, [name, value], binding) => {
        const buffer = this.createBuffer(
          // wrap number uniforms
          (typeof value === 'number' ? new Float32Array([value]) : value) as Float32Array | Uint16Array,
          GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        )
        const uniform = { binding, resource: { buffer } }
        acc.set(name, uniform)

        return acc
      }, new Map())

      // Create uniform layout
      const entries = Array.from(uniforms.values())
      const layout = pipeline.getBindGroupLayout(0)
      const uniformBindGroup = this._device.createBindGroup({ entries, layout })

      compiled.set(material.uuid, { uniforms, uniformBindGroup, dispose: () => {} } as WebGPUMaterial)

      return uniformBindGroup
    } else {
      const { uniforms, uniformBindGroup } = compiledMaterial

      Object.entries(material.uniforms).forEach(([name, value]) => {
        const uniform = uniforms.get(name)!

        const prevUniform = uniform.resource.value!
        const needsUpdate = !compareUniforms(prevUniform, value)

        if (needsUpdate) {
          this._device.queue.writeBuffer(
            uniform.resource.buffer,
            0,
            // wrap number uniforms
            typeof value === 'number' ? new Float32Array([value]) : value,
          )
        }

        // @ts-expect-error
        if (prevUniform === undefined) uniform.resource.value = value?.clone() ?? value
      })

      return uniformBindGroup
    }
  }

  /**
   * Compiles or updates a geometry's attributes and binds them to a program.
   */
  compileGeometry(geometry: Geometry) {
    // Create buffer attributes on first run, otherwise update them
    if (!compiled.has(geometry.uuid)) {
      const attributes: WebGPUAttributeMap = new Map()

      Object.entries(geometry.attributes).forEach(([name, attribute], slot) => {
        const usage = name === 'index' ? GPUBufferUsage.INDEX : GPUBufferUsage.VERTEX
        const buffer = this.createBuffer(attribute.data, usage)
        attributes.set(name, { buffer, slot })

        compiled.set(geometry.uuid, {
          attributes,
          dispose: () => {
            attributes.forEach((attribute) => attribute.buffer.destroy())
          },
        } as WebGPUGeometry)
      })

      return attributes
    } else {
      const { attributes } = compiled.get(geometry.uuid)! as WebGPUGeometry

      Object.entries(geometry.attributes).forEach(([name, attribute]) => {
        if (!attribute.needsUpdate) return

        // Update attribute buffer
        const { buffer } = attributes.get(name)!
        this._device.queue.writeBuffer(buffer, attribute.data.byteOffset, attribute.data)
      })

      return attributes
    }
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

    // Get material state
    const cullMode = GPU_CULL_SIDES[mesh.material.side] ?? GPU_CULL_SIDES.front
    const topology = GPU_DRAW_MODES[mesh.mode] ?? GPU_DRAW_MODES.triangles
    const depthWriteEnabled = mesh.material.depthWrite
    const depthCompare = mesh.material.depthTest ? 'always' : 'less'

    // Flag for updates on param change
    let needsUpdate: boolean

    const compiledMesh = compiled.get(mesh.uuid) as WebGPUMesh | undefined
    if (compiledMesh) {
      const { primitive, depthStencil } = compiledMesh

      needsUpdate =
        primitive?.cullMode !== cullMode ||
        primitive?.topology !== topology ||
        depthStencil?.depthWriteEnabled !== depthWriteEnabled ||
        depthStencil?.depthCompare !== depthCompare
    } else {
      needsUpdate = true
    }

    // Create pipeline on first bind or when updated
    if (needsUpdate) {
      // Compile shaders
      const { vertex, fragment } = this.compileShaders(mesh)

      // Allocate buffer attributes
      vertex.buffers = Object.entries(mesh.geometry.attributes).map(([name, { size, data }], index) => {
        const type = name === 'index' ? 'uint16' : 'float32'
        const suffix = size === 1 ? '' : `x${size}`

        return {
          attributes: [
            {
              shaderLocation: index,
              offset: data.byteOffset,
              format: `${type}${suffix}`,
            },
          ],
          arrayStride: size * data.BYTES_PER_ELEMENT,
          stepMode: name === 'index' ? 'instance' : 'vertex',
        } as GPUVertexBufferLayout
      })

      // Create mesh rendering pipeline from program
      const pipelineDesc: GPURenderPipelineDescriptor = {
        vertex,
        fragment,
        primitive: {
          frontFace: 'ccw',
          cullMode,
          topology,
        },
        depthStencil: {
          depthWriteEnabled,
          depthCompare,
          format: 'depth24plus-stencil8',
        },
        multisample: { count: 4 },
      }
      const pipeline = this._device.createRenderPipeline(pipelineDesc)

      compiled.set(mesh.uuid, {
        ...pipelineDesc,
        pipeline,
        dispose: () => {},
      } as WebGPUMesh)
    }

    // Bind pipeline
    const pipeline: GPURenderPipeline = compiled.get(mesh.uuid)!.pipeline
    const uniformBindGroup = this.compileMaterial(mesh.material, pipeline)
    const attributes = this.compileGeometry(mesh.geometry)

    return { pipeline, uniformBindGroup, attributes }
  }

  render(scene: Object3D, camera?: Camera) {
    // Begin recording GL commands
    const commandEncoder = this._device.createCommandEncoder()

    // Flush screen. If not anti-aliasing, re-use color texture
    if (!this._params.antialias) {
      this._colorTexture = this.gl.getCurrentTexture()
      this._colorTextureView = this._colorTexture.createView()
    }

    // Create frame
    const resolveTarget = this._params.antialias ? this.gl.getCurrentTexture().createView() : undefined
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this._colorTextureView,
          resolveTarget,
          loadValue: { r: this.clearColor.r, g: this.clearColor.g, b: this.clearColor.b, a: this.clearAlpha },
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this._depthTextureView,
        depthLoadValue: 1,
        depthStoreOp: 'store',
        stencilLoadValue: 'load',
        stencilStoreOp: 'store',
      },
    })

    // Update drawing area
    passEncoder.setViewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, 0, 1)
    passEncoder.setScissorRect(this.scissor.x, this.scissor.y, this.scissor.width, this.scissor.height)

    // Update scene matrices
    scene.updateMatrix()

    // Update camera matrices
    if (camera) camera.updateMatrix()
    if (camera?.needsUpdate) {
      camera.updateProjectionMatrix()
      camera.projectionMatrix.multiply(NDCConversionMatrix)
      camera.needsUpdate = false
    }

    // Render children
    this.sort(scene, camera).forEach((mesh) => {
      // Compile on first render, otherwise update
      const { pipeline, uniformBindGroup, attributes } = this.compileMesh(mesh, camera)

      // Bind
      passEncoder.setPipeline(pipeline)
      passEncoder.setBindGroup(0, uniformBindGroup)
      attributes.forEach((attribute, name) => {
        if (name === 'index') {
          passEncoder.setIndexBuffer(attribute.buffer, 'uint16')
        } else {
          passEncoder.setVertexBuffer(attribute.slot, attribute.buffer)
        }
      })

      // Alternate drawing for indexed and non-indexed meshes
      const { index, position } = mesh.geometry.attributes
      if (mesh.geometry.attributes.index) {
        passEncoder.drawIndexed(index.data.length / index.size)
      } else {
        passEncoder.draw(position.data.length / position.size)
      }
    })

    // Cleanup frame, submit GL commands
    passEncoder.endPass()
    this._device.queue.submit([commandEncoder.finish()])
  }

  dispose() {
    this._depthTexture.destroy()
    this._colorTexture.destroy()
    this._device.destroy()
  }
}
