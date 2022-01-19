import { Matrix4 } from '../math/Matrix4'
import { Renderer } from '../core/Renderer'
import type { Mesh } from '../core/Mesh'
import type { Scene } from '../core/Scene'
import type { Camera } from '../core/Camera'
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

interface CompiledMesh {
  uniforms: Map<string, GPUBuffer>
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
  private _compiled = new Map<Mesh['uuid'], CompiledMesh>()

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
      size: data.byteLength,
      usage,
      mappedAtCreation: true,
    })

    // Map packed buffer
    const ArrayView = data instanceof Uint16Array ? Uint16Array : Float32Array
    new ArrayView(buffer.getMappedRange()).set(data)
    buffer.unmap()

    return buffer
  }

  private compileUniformLayout(mesh: Mesh, camera?: Camera) {
    // Add built-ins
    mesh.material.uniforms.modelMatrix = mesh.worldMatrix

    if (camera) {
      mesh.material.uniforms.modelViewMatrix = mesh.modelViewMatrix
      mesh.material.uniforms.normalMatrix = mesh.normalMatrix
      mesh.material.uniforms.viewMatrix = camera.viewMatrix
      mesh.material.uniforms.projectionMatrix = camera.projectionMatrix
    }

    // Create uniform buffers to bind
    const uniforms = new Map()
    const entries = Object.entries(mesh.material.uniforms).map(([name, value], index) => {
      // Cache initial uniform
      const buffer = this.createBuffer(value, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
      uniforms.set(name, buffer)

      return {
        binding: index,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
        },
        resource: {
          buffer,
        },
      }
    })

    // Create program bind, layout
    // @ts-expect-error WebGPU buffer type is incorrect
    const uniformBindGroupLayout = this._device.createBindGroupLayout({ entries })
    const uniformBindGroup = this._device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries,
    })
    const layout = this._device.createPipelineLayout({
      bindGroupLayouts: [uniformBindGroupLayout],
    })

    return { uniforms, uniformBindGroup, layout }
  }

  private compileShaders(mesh: Mesh) {
    // Allocate non-index buffer attributes
    const vertexBuffers = Object.entries(mesh.geometry.attributes)
      .filter(([name]) => name !== 'index')
      .map(
        ([_, { size }], index) =>
          ({
            attributes: [
              {
                shaderLocation: index,
                offset: 0,
                format: `float32x${size}`,
              },
            ],
            arrayStride: 4 * size,
            stepMode: 'vertex',
          } as GPUVertexBufferLayout),
      )

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
        },
      ],
    }

    return { vertex, fragment }
  }

  private compileMesh(mesh: Mesh, camera?: Camera) {
    // Compile shaders and their uniforms
    const { uniforms, uniformBindGroup, layout } = this.compileUniformLayout(mesh, camera)
    const { vertex, fragment } = this.compileShaders(mesh)

    // Create mesh rendering pipeline from program
    const multisample = this._params.antialias ? { count: 4 } : undefined
    const pipeline = this._device.createRenderPipeline({
      layout,
      vertex,
      fragment,
      primitive: {
        frontFace: 'ccw',
        cullMode: GPU_CULL_SIDES[mesh.material.side] ?? GPU_CULL_SIDES.back,
        topology: GPU_DRAW_MODES[mesh.mode] ?? GPU_DRAW_MODES.triangles,
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus-stencil8',
      },
      multisample,
    })

    // Create buffer attributes
    const buffers = new Map<string, GPUBuffer>()
    Object.entries(mesh.geometry.attributes).forEach(([name, attribute]) => {
      const usage = name === 'index' ? GPUBufferUsage.INDEX : GPUBufferUsage.VERTEX
      const buffer = this.createBuffer(attribute.data, usage)
      buffers.set(name, buffer)
    })

    this._compiled.set(mesh.uuid, { uniforms, uniformBindGroup, pipeline, buffers })
  }

  private updateUniforms(mesh: Mesh) {
    const compiled = this._compiled.get(mesh.uuid)!

    Object.entries(mesh.material.uniforms).forEach(([name, value]) => {
      const buffer = compiled.uniforms.get(name)!
      this._device.queue.writeBuffer(buffer, value.byteOffset, value)
    })
  }

  private updateAttributes(mesh: Mesh) {
    const compiled = this._compiled.get(mesh.uuid)!

    Object.entries(mesh.geometry.attributes).forEach(([name, attribute]) => {
      if (!attribute.needsUpdate) return

      // Update attribute buffer
      const buffer = compiled.buffers.get(name)!
      this._device.queue.writeBuffer(buffer, attribute.data.byteOffset, attribute.data)
    })
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

    // Update camera matrices
    if (camera) camera.updateMatrixWorld()
    if (camera?.needsUpdate) {
      camera.updateProjectionMatrix()
      camera.projectionMatrix.multiply(NDCConversionMatrix)
      camera.needsUpdate = false
    }

    // Render children
    const renderList = scene.children as Mesh[]
    renderList.forEach((mesh) => {
      mesh.updateMatrixWorld(camera)

      // Don't render invisible objects
      // TODO: filter out occluded meshes
      if (!mesh.isMesh || !mesh.visible) return

      // Compile on first render
      const isCompiled = this._compiled.has(mesh.uuid)
      if (!isCompiled) this.compileMesh(mesh, camera)

      // Bind
      const compiled = this._compiled.get(mesh.uuid)!
      passEncoder.setPipeline(compiled.pipeline)
      passEncoder.setBindGroup(0, compiled.uniformBindGroup)
      Object.keys(mesh.geometry.attributes)
        .filter((name) => name !== 'index')
        .forEach((name, slot) => {
          passEncoder.setVertexBuffer(slot, compiled.buffers.get(name)!)
        })

      // Update uniforms & attributes
      this.updateUniforms(mesh)
      this.updateAttributes(mesh)

      // TODO: Update material state

      // Alternate drawing for indexed and non-indexed meshes
      const { index, position } = mesh.geometry.attributes
      if (mesh.geometry.attributes.index) {
        passEncoder.setIndexBuffer(compiled.buffers.get('index')!, 'uint16')
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
    this._compiled.forEach(({ buffers }) => {
      buffers.forEach((buffer) => buffer.destroy())
    })
    this._compiled.clear()

    this._depthTexture.destroy()
    this._colorTexture.destroy()

    this._device.destroy()
  }
}
