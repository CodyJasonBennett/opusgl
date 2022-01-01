import { Color } from '../math/Color'
import type { Mesh } from '../core/Mesh'
import type { Scene } from '../core/Scene'

export interface WebGPURendererOptions {
  /**
   * An optional canvas element to draw to.
   */
  canvas: HTMLCanvasElement
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
  uniforms: Map<string, { value: any; buffer: GPUBuffer }>
  uniformBindGroup: GPUBindGroup
  pipeline: GPURenderPipeline
  buffers: Map<string, GPUBuffer>
}

export class WebGPURenderer {
  readonly canvas: HTMLCanvasElement
  public gl: GPUCanvasContext
  public clearColor = new Color(1, 1, 1)
  public clearAlpha = 0

  private _pixelRatio = 1
  private _viewport: { x: number; y: number; width: number; height: number; minDepth: number; maxDepth: number }
  private _scissor: { x: number; y: number; width: number; height: number }

  private _params: Partial<WebGPURendererOptions>
  private _adapter: GPUAdapter
  private _device: GPUDevice
  private _presentationFormat: GPUTextureFormat
  private _colorTexture: GPUTexture
  private _colorTextureView: GPUTextureView
  private _depthTexture: GPUTexture
  private _depthTextureView: GPUTextureView
  private _compiled = new Map<Mesh['id'], CompiledMesh>()

  constructor({ canvas = document.createElement('canvas'), ...params }: Partial<WebGPURendererOptions> = {}) {
    this.canvas = canvas
    this._params = params

    this.setSize(canvas.width, canvas.height)
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

  setSize(width: number, height: number) {
    this.canvas.width = Math.floor(width * this.pixelRatio)
    this.canvas.height = Math.floor(height * this.pixelRatio)

    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    this.setViewport(0, 0, width, height)
    this.setScissor(0, 0, width, height)
  }

  get viewport() {
    return this._viewport
  }

  setViewport(x: number, y: number, width: number, height: number, minDepth = 0, maxDepth = 1) {
    this._viewport = { x, y, width, height, minDepth, maxDepth }
  }

  get scissor() {
    return this._scissor
  }

  setScissor(x: number, y: number, width: number, height: number) {
    this._scissor = { x, y, width, height }
  }

  async init() {
    // Check for compatibility
    const isSupported = typeof window !== 'undefined' && 'gpu' in navigator
    if (!isSupported) throw 'WebGPU is not supported on this device!'

    // Init API
    this._adapter = await navigator.gpu.requestAdapter(this._params)
    this._device = await this._adapter.requestDevice(this._params)

    // Init GL
    this.gl = this.canvas.getContext('webgpu')
    this._presentationFormat = this.gl.getPreferredFormat(this._adapter)
    this.gl.configure({
      device: this._device,
      format: this._presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    })

    // Init depth
    const depthTextureDesc: GPUTextureDescriptor = {
      size: [this._viewport.width, this._viewport.height, 1],
      dimension: '2d',
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    }
    this._depthTexture = this._device.createTexture(depthTextureDesc)
    this._depthTextureView = this._depthTexture.createView()
  }

  private createBuffer(data: Uint16Array | Float32Array, usage?: number) {
    // @ts-expect-error Unwrap MathArrays
    data = data.isMathArray ? data.instance : data

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

  private compileUniformLayout(child: Mesh) {
    // Create uniform buffers to bind
    const uniforms = new Map()
    const entries = Object.entries(child.material.uniforms).map(([name, value], index) => {
      // Cache initial uniform
      const buffer = this.createBuffer(value, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
      uniforms.set(name, { buffer: buffer, value: value.clone?.() ?? value })

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

  private compileShaders(child: Mesh) {
    // Allocate non-index buffer attributes
    const vertexBuffers = Object.entries(child.geometry.attributes)
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
        code: child.material.vertex,
      }),
      entryPoint: 'main',
      buffers: vertexBuffers,
    }

    const fragment: GPUFragmentState = {
      module: this._device.createShaderModule({
        code: child.material.fragment,
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

  private compileMesh(child: Mesh) {
    // Compile shaders and their uniforms
    const { uniforms, uniformBindGroup, layout } = this.compileUniformLayout(child)
    const { vertex, fragment } = this.compileShaders(child)

    // Create mesh rendering pipeline from program
    const pipeline = this._device.createRenderPipeline({
      layout,
      vertex,
      fragment,
      primitive: {
        frontFace: 'cw',
        cullMode: 'none',
        topology: 'triangle-list',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus-stencil8',
      },
    })

    // Create buffer attributes
    const buffers = new Map<string, GPUBuffer>()
    Object.entries(child.geometry.attributes).forEach(([name, attribute]) => {
      const usage = name === 'index' ? GPUBufferUsage.INDEX : GPUBufferUsage.VERTEX
      const buffer = this.createBuffer(attribute.data, usage)
      buffers.set(name, buffer)
    })

    this._compiled.set(child.id, { uniforms, uniformBindGroup, pipeline, buffers })
  }

  private updateUniforms(child: Mesh, commandEncoder: GPUCommandEncoder) {
    const compiled = this._compiled.get(child.id)

    Object.entries(child.material.uniforms).forEach(([name, value]) => {
      const uniform = compiled.uniforms.get(name)

      // Bail if uniform hasn't changed
      const needsUpdate =
        typeof uniform.value.equals === 'function' ? !uniform.value.equals(value) : uniform.value !== value
      if (!needsUpdate) return

      // Update uniform buffer
      const buffer = this.createBuffer(value, GPUBufferUsage.COPY_SRC)
      commandEncoder.copyBufferToBuffer(buffer, 0, uniform.buffer, value.byteOffset, value.byteLength)

      // Cache new uniform
      compiled.uniforms.set(name, { buffer, value: value.clone?.() ?? value })
    })
  }

  private updateAttributes(child: Mesh, commandEncoder: GPUCommandEncoder) {
    const compiled = this._compiled.get(child.id)

    Object.entries(child.geometry.attributes).forEach(([name, attribute]) => {
      if (!attribute.needsUpdate) return

      // Update attribute buffer
      const buffer = this.createBuffer(attribute.data, GPUBufferUsage.COPY_SRC)
      const target = compiled.buffers.get(name)
      commandEncoder.copyBufferToBuffer(buffer, 0, target, attribute.data.byteOffset, attribute.data.byteLength)

      // Cache attribute buffer
      compiled.buffers.set(name, buffer)
    })
  }

  private updateFrame(commandEncoder: GPUCommandEncoder) {
    // Flush screen
    this._colorTexture = this.gl.getCurrentTexture()
    this._colorTextureView = this._colorTexture.createView()

    // Create frame
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this._colorTextureView,
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

    return passEncoder
  }

  render(scene: Scene) {
    // Begin recording GL commands
    const commandEncoder = this._device.createCommandEncoder()

    // Compile meshes and handle updates
    scene.children.forEach((child: Mesh) => {
      if (!child.isMesh || !child.visible) return

      // Compile on first render
      const isCompiled = this._compiled.has(child.id)
      if (!isCompiled) this.compileMesh(child)

      // Update uniforms & attributes
      this.updateUniforms(child, commandEncoder)
      this.updateAttributes(child, commandEncoder)
    })

    // Create and update frame
    const passEncoder = this.updateFrame(commandEncoder)
    passEncoder.setViewport(this._viewport.x, this._viewport.y, this._viewport.width, this._viewport.height, 0, 1)
    passEncoder.setScissorRect(this._scissor.x, this._scissor.y, this._scissor.width, this._scissor.height)

    // Render children
    scene.children.forEach((child: Mesh) => {
      if (!child.isMesh || !child.visible) return

      // Bind
      const compiled = this._compiled.get(child.id)
      passEncoder.setPipeline(compiled.pipeline)
      passEncoder.setBindGroup(0, compiled.uniformBindGroup)
      Object.keys(child.geometry.attributes)
        .filter((name) => name !== 'index')
        .forEach((name, slot) => {
          passEncoder.setVertexBuffer(slot, compiled.buffers.get(name))
        })

      // Alternate drawing for indexed and non-indexed meshes
      const { index, position } = child.geometry.attributes
      if (child.geometry.attributes.index) {
        passEncoder.setIndexBuffer(compiled.buffers.get('index'), 'uint16')
        passEncoder.drawIndexed(index.data.length / index.size, 1, 0, 0, 0)
      } else {
        passEncoder.draw(position.data.length / position.size, 1, 0, 0)
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
