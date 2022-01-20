import { Matrix4 } from '../math/Matrix4'
import { Renderer } from '../core/Renderer'
import type { Material } from '../core/Material'
import type { Geometry } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Scene } from '../core/Scene'
import type { Camera } from '../core/Camera'
import { compiled } from '../utils'
import { GPU_CULL_SIDES, GPU_DRAW_MODES } from '../constants'

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

type GPUUniformBuffer = GPUBindGroupEntry & { resource: { buffer: GPUBuffer } }

interface CompiledMesh {
  uniforms: Map<string, GPUUniformBuffer>
  uniformBindGroup: GPUBindGroup
  pipeline: GPURenderPipeline
  buffers: Map<string, GPUBuffer>
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
  private _passEncoder!: GPURenderPassEncoder

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
  }

  private createBuffer(data: Uint16Array | Float32Array, usage: GPUBufferUsageFlags) {
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

  private compileShaders(mesh: Mesh) {
    // Allocate buffer attributes
    const vertexBuffers = Object.entries(mesh.geometry.attributes).map(([name, { size, data }], index) => {
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

    const vertex: GPUVertexState = {
      module: this._device.createShaderModule({
        code: mesh.material.vertex,
      }),
      entryPoint: 'main',
      buffers: vertexBuffers,
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

  private updatePipeline(mesh: Mesh): GPURenderPipeline {
    // Get material state
    const cullMode = GPU_CULL_SIDES[mesh.material.side] ?? GPU_CULL_SIDES.front
    const topology = GPU_DRAW_MODES[mesh.mode] ?? GPU_DRAW_MODES.triangles
    const depthWriteEnabled = mesh.material.depthWrite
    const depthCompare = mesh.material.depthTest ? 'always' : 'less'

    // Flag for updates on param change
    let needsUpdate: boolean
    if (compiled.has(mesh.uuid)) {
      const { primitive, depthStencil } = compiled.get(mesh.uuid)!

      needsUpdate =
        primitive.cullMode !== cullMode ||
        primitive.topology !== topology ||
        depthStencil.depthWriteEnabled !== depthWriteEnabled ||
        depthStencil.depthCompare !== depthCompare
    } else {
      needsUpdate = true
    }

    // Create pipeline on first bind or when updated
    if (needsUpdate) {
      // Compile shaders
      const { vertex, fragment } = this.compileShaders(mesh)

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
      })
    }

    // Bind pipeline
    const pipeline = compiled.get(mesh.uuid)!.pipeline
    this._passEncoder.setPipeline(pipeline)

    return pipeline
  }

  private updateMaterial(material: Material, pipeline: GPURenderPipeline) {
    // Create uniform layout on first run, otherwise update uniforms
    if (!compiled.has(material.uuid)) {
      // Create uniform buffers to bind
      const uniforms = Object.entries(material.uniforms).reduce((acc, [name, value], binding) => {
        const buffer = this.createBuffer(value, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
        const uniform = { binding, resource: { buffer } }
        acc.set(name, uniform)

        return acc
      }, new Map<string, GPUUniformBuffer>())

      // Create uniform layout
      const entries = Array.from(uniforms.values())
      const layout = pipeline.getBindGroupLayout(0)
      const uniformBindGroup = this._device.createBindGroup({ entries, layout })

      compiled.set(material.uuid, { uniforms, uniformBindGroup, dispose: () => {} })
    } else {
      const { uniforms } = compiled.get(material.uuid)!

      Object.entries(material.uniforms).forEach(([name, value]) => {
        const { buffer } = uniforms.get(name)!.resource
        this._device.queue.writeBuffer(buffer, value.byteOffset, value)
      })
    }

    // Update uniforms & attributes
    const { uniformBindGroup } = compiled.get(material.uuid)!
    this._passEncoder.setBindGroup(0, uniformBindGroup)
  }

  private updateGeometry(geometry: Geometry) {
    // Create buffer attributes on first run, otherwise update them
    if (!compiled.has(geometry.uuid)) {
      const buffers = new Map<string, GPUBuffer>()

      Object.entries(geometry.attributes).forEach(([name, attribute]) => {
        const usage = name === 'index' ? GPUBufferUsage.INDEX : GPUBufferUsage.VERTEX
        const buffer = this.createBuffer(attribute.data, usage)
        buffers.set(name, buffer)

        compiled.set(geometry.uuid, {
          buffers,
          dispose: () => {
            buffers.forEach((buffer) => buffer.destroy())
          },
        })
      })
    } else {
      const { buffers } = compiled.get(geometry.uuid)!

      Object.entries(geometry.attributes).forEach(([name, attribute]) => {
        if (!attribute.needsUpdate) return

        // Update attribute buffer
        const buffer = buffers.get(name)!
        this._device.queue.writeBuffer(buffer, attribute.data.byteOffset, attribute.data)
      })
    }

    // Bind attributes
    const { buffers } = compiled.get(geometry.uuid)!
    Object.keys(geometry.attributes).forEach((name, slot) => {
      if (name === 'index') {
        this._passEncoder.setIndexBuffer(buffers.get(name)!, 'uint16')
      } else {
        this._passEncoder.setVertexBuffer(slot, buffers.get(name)!)
      }
    })
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

    const pipeline = this.updatePipeline(mesh)
    this.updateMaterial(mesh.material, pipeline)
    this.updateGeometry(mesh.geometry)
  }

  render(scene: Scene, camera?: Camera) {
    // Begin recording GL commands
    const commandEncoder = this._device.createCommandEncoder()

    // Flush screen. If not anti-aliasing, re-use color texture
    if (!this._params.antialias) {
      this._colorTexture = this.gl.getCurrentTexture()
      this._colorTextureView = this._colorTexture.createView()
    }

    // Create frame
    const resolveTarget = this._params.antialias ? this.gl.getCurrentTexture().createView() : undefined
    this._passEncoder = commandEncoder.beginRenderPass({
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
    this._passEncoder.setViewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, 0, 1)
    this._passEncoder.setScissorRect(this.scissor.x, this.scissor.y, this.scissor.width, this.scissor.height)

    // Update camera matrices
    if (camera) camera.updateMatrix()
    if (camera?.needsUpdate) {
      camera.updateProjectionMatrix()
      camera.projectionMatrix.multiply(NDCConversionMatrix)
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
      if (mesh.geometry.attributes.index) {
        this._passEncoder.drawIndexed(index.data.length / index.size)
      } else {
        this._passEncoder.draw(position.data.length / position.size)
      }
    })

    // Cleanup frame, submit GL commands
    this._passEncoder.endPass()
    this._device.queue.submit([commandEncoder.finish()])
  }

  dispose() {
    this._depthTexture.destroy()
    this._colorTexture.destroy()
    this._device.destroy()
  }
}
