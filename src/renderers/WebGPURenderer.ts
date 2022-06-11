/// <reference types="@webgpu/types" />
import { Compiled, Renderer } from '../core/Renderer'
import { Texture } from '../core/Texture'
import type { Disposable } from '../core/Renderer'
import type { TextureOptions } from '../core/Texture'
import type { RenderTarget } from '../core/RenderTarget'
import type { AttributeData, AttributeList } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Camera } from '../core/Camera'
import type { Object3D } from '../core/Object3D'
import type { Uniform, UniformList } from '../core/Material'
import { GPU_CULL_SIDES, GPU_DRAW_MODES, GPU_TEXTURE_FILTERS, GPU_TEXTURE_WRAPPINGS } from '../constants'
import { cloneUniform, uniformsEqual } from '../utils'

/**
 * Constructs a WebGPU buffer. Can be used to transmit binary data to the GPU.
 */
export class WebGPUBufferObject implements Disposable {
  readonly device: GPUDevice
  readonly buffer: GPUBuffer

  constructor(device: GPUDevice, data: AttributeData, usage: GPUBufferUsageFlags) {
    this.device = device

    this.buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    })

    // @ts-ignore
    new data.constructor(this.buffer.getMappedRange()).set(data)
    this.buffer.unmap()
  }

  /**
   * Writes binary data to buffer.
   */
  write(data: AttributeData) {
    this.device.queue.writeBuffer(this.buffer, 0, data)
  }

  /**
   * Disposes the buffer from GPU memory.
   */
  dispose() {
    this.buffer.destroy()
  }
}

// Pad to 16 byte chunks of 2, 4 (std140 layout)
const pad2 = (n: number) => n + (n % 2)
const pad4 = (n: number) => n + ((4 - (n % 4)) % 4)

/**
 * Constructs a WebGPU uniform buffer. Packs uniforms into a buffer via std140.
 */
export class WebGPUUniformBuffer extends WebGPUBufferObject {
  readonly uniforms: Map<string, Exclude<Uniform, Texture>>
  readonly data: Float32Array

  constructor(device: GPUDevice, uniforms: UniformList) {
    // Memoize uniforms
    const memoizedUniforms = new Map<string, Exclude<Uniform, Texture>>()
    for (const name in uniforms) {
      if (uniforms[name] instanceof Texture) continue
      const uniform = cloneUniform(uniforms[name])
      memoizedUniforms.set(name, uniform)
    }

    // Calculate packing byte-length
    const length = pad4(
      Array.from(memoizedUniforms.values()).reduce(
        (n: number, u) => n + (typeof u === 'number' ? 1 : u.length <= 2 ? pad2(u.length) : pad4(u.length)),
        0,
      ),
    )
    const data = new Float32Array(length)

    super(device, data, GPUBufferUsage.UNIFORM)

    this.uniforms = memoizedUniforms
    this.data = data
  }

  /**
   * Updates packed uniforms.
   */
  update(uniforms: UniformList) {
    // Check whether a uniform has changed
    let needsUpdate = false
    this.uniforms.forEach((value, name) => {
      const uniform = uniforms[name]
      if (!uniformsEqual(value, uniform)) {
        this.uniforms.set(name, cloneUniform(uniform))
        needsUpdate = true
      }
    })

    // If a uniform changed, rebuild entire buffer
    // TODO: expand write to subdata at affected indices instead
    if (needsUpdate) {
      let offset = 0
      for (const uniform of Array.from(this.uniforms.values())) {
        if (typeof uniform === 'number') {
          this.data[offset] = uniform
          offset += 1 // leave empty space to stack primitives
        } else {
          const pad = uniform.length <= 2 ? pad2 : pad4
          offset = pad(offset) // fill in empty space
          this.data.set(uniform, offset)
          offset += pad(uniform.length)
        }
      }

      this.write(this.data)
    }
  }

  dispose() {
    super.dispose()
    this.uniforms.clear()
  }
}

export interface WebGPUBufferAttribute extends Partial<GPUVertexBufferLayout> {
  slot?: number
  indexFormat?: GPUIndexFormat
  buffer: WebGPUBufferObject
}

/**
 * Constructs a WebGPU buffer attribute manager.
 */
export class WebGPUBufferAttributes implements Disposable {
  readonly device: GPUDevice
  readonly attributes = new Map<string, WebGPUBufferAttribute>()

  constructor(device: GPUDevice, attributes: AttributeList) {
    this.device = device

    let offset = 0
    Object.entries(attributes).forEach(([name, attribute], index) => {
      const formatType = attribute.data instanceof Float32Array ? 'float' : 'uint'
      const formatBits = attribute.data.BYTES_PER_ELEMENT * 8
      const formatName = formatType + formatBits

      if (name === 'index') {
        offset -= 1
        const buffer = new WebGPUBufferObject(this.device, attribute.data, GPUBufferUsage.INDEX)
        this.attributes.set(name, { indexFormat: formatName as GPUIndexFormat, buffer })
      } else {
        const slot = index + offset
        const buffer = new WebGPUBufferObject(this.device, attribute.data, GPUBufferUsage.VERTEX)

        this.attributes.set(name, {
          slot,
          buffer,
          arrayStride: attribute.size * attribute.data.BYTES_PER_ELEMENT,
          attributes: [
            {
              shaderLocation: slot,
              offset: 0,
              format: `${formatName}x${attribute.size}`,
            },
          ],
        } as WebGPUBufferAttribute)
      }
    })
  }

  bind(passEncoder: GPURenderPassEncoder) {
    this.attributes.forEach((attribute, name) => {
      if (name === 'index') {
        passEncoder.setIndexBuffer(attribute.buffer.buffer, attribute.indexFormat!)
      } else {
        passEncoder.setVertexBuffer(attribute.slot!, attribute.buffer.buffer)
      }
    })
  }

  /**
   * Updates attributes flagged for update.
   */
  update(attributes: AttributeList) {
    this.attributes.forEach(({ buffer }, name) => {
      if (name === 'index') return

      const attribute = attributes[name]
      if (attribute.needsUpdate) {
        buffer.write(attribute.data)
        attribute.needsUpdate = false
      }
    })
  }

  /**
   * Disposes of attributes from GPU memory.
   */
  dispose() {
    this.attributes.forEach(({ buffer }) => buffer.dispose())
    this.attributes.clear()
  }
}

export interface BindGroupInfoStructMember {
  name: string
  type: any
}
export interface BindGroupInfoStruct {
  name: string
  type: 'struct'
  children: BindGroupInfoStructMember[]
}
export interface BindGroupInfoResource {
  name: string
  type: any
  binding: number
  group: number
}
export interface BindGroupInfoGroup {
  samplers: BindGroupInfoResource[]
  textures: BindGroupInfoResource[]
  buffers: BindGroupInfoResource[]
}
export interface BindGroupInfo {
  structs: Map<string, BindGroupInfoStruct>
  resources: Map<string, BindGroupInfoResource>
  groups: Map<number, BindGroupInfoGroup>
}

/**
 * Constructs a WebGPU render pipeline. Manages program state and bindings.
 */
export class WebGPURenderPipeline implements Disposable {
  readonly device: GPUDevice
  readonly format: GPUTextureFormat
  public pipelineState!: {
    transparent: boolean
    cullMode: typeof GPU_CULL_SIDES[keyof typeof GPU_CULL_SIDES]
    topology: typeof GPU_DRAW_MODES[keyof typeof GPU_DRAW_MODES]
    depthWriteEnabled: boolean
    depthCompare: GPUCompareFunction
  }
  public pipeline!: GPURenderPipeline
  readonly bindGroups: Map<number, GPUBindGroup> = new Map()
  readonly bindGroupEntries: Map<number, GPUBindGroupEntry[]> = new Map()
  readonly UBOs: Map<string, WebGPUUniformBuffer> = new Map()

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device
    this.format = format
  }

  /**
   * Binds the render pipeline and its attachments to a render pass encoder.
   */
  bind(passEncoder: GPURenderPassEncoder) {
    passEncoder.setPipeline(this.pipeline)
    this.bindGroups.forEach((bindGroup, index) => {
      passEncoder.setBindGroup(index, bindGroup)
    })
  }

  /**
   * Updates pipeline state against a mesh and its attributes.
   */
  update(target: Mesh, bufferAttributes: WebGPUBufferAttributes, colorAttachments = 1) {
    const transparent = target.material.transparent
    const cullMode = GPU_CULL_SIDES[target.material.side]
    const topology = GPU_DRAW_MODES[target.mode]
    const depthWriteEnabled = target.material.depthWrite
    const depthCompare = (target.material.depthTest ? 'less' : 'always') as GPUCompareFunction

    if (
      transparent === this.pipelineState?.transparent &&
      cullMode === this.pipelineState?.cullMode &&
      topology === this.pipelineState?.topology &&
      depthWriteEnabled === this.pipelineState?.depthWriteEnabled &&
      depthCompare === this.pipelineState?.depthCompare
    )
      return

    this.pipelineState = {
      transparent,
      cullMode,
      topology,
      depthWriteEnabled,
      depthCompare,
    }

    const buffers: GPUVertexBufferLayout[] = []
    bufferAttributes.attributes.forEach((attribute, name) => {
      if (name === 'index') return
      buffers.push(attribute as GPUVertexBufferLayout)
    })

    this.pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({ code: target.material.vertex }),
        entryPoint: 'main',
        buffers,
      },
      fragment: {
        module: this.device.createShaderModule({ code: target.material.fragment }),
        entryPoint: 'main',
        targets: Array(colorAttachments).fill({
          format: this.format,
          blend: this.pipelineState.transparent
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
        }),
      },
      primitive: {
        frontFace: 'ccw',
        cullMode: this.pipelineState.cullMode,
        topology: this.pipelineState.topology,
      },
      depthStencil: {
        depthWriteEnabled: this.pipelineState.depthWriteEnabled,
        depthCompare: this.pipelineState.depthCompare,
        format: 'depth24plus-stencil8',
      },
      layout: 'auto',
    })

    this.bindGroupEntries.forEach((entries, index) => {
      const bindGroup = this.device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(index),
        entries,
      })
      this.bindGroups.set(index, bindGroup)
    })
  }

  /**
   * Parses bind group info for a group of shaders.
   */
  getBindGroupInfo(...shaders: string[]): BindGroupInfo {
    // Remove comments from shaders
    const shaderSource = shaders.join('\n').replace(/\/\*(?:[^*]|\**[^*/])*\*+\/|\/\/.*/g, '')

    // Parse struct defs
    const structs = new Map<string, BindGroupInfoStruct>()
    for (const struct of shaderSource.matchAll(/struct\s*(\w+)\s*\{([^\}]+)\}/g)) {
      const [, name, content] = struct

      const children: BindGroupInfoStructMember[] = []
      for (const child of Array.from(content.matchAll(/(\w+)(?:\s*:\s*)(\w+)/g))) {
        const [, name, type] = child
        children.push({ name, type })
      }

      structs.set(name, { name, type: 'struct', children })
    }

    // Parse resource defs
    const resources = new Map<string, BindGroupInfoResource>()
    for (const resource of shaderSource.matchAll(/@binding\((\d+)\)\s*@group\((\d+)\).*\s(\w+)\s*:\s*(\w+)/g)) {
      const [, binding, group, name, type] = resource
      resources.set(name, {
        name,
        type,
        binding: Number(binding),
        group: Number(group),
      })
    }

    // Filter resources by group and type
    const groups = new Map<number, BindGroupInfoGroup>()
    resources.forEach((resource) => {
      if (!groups.has(resource.group)) groups.set(resource.group, { samplers: [], textures: [], buffers: [] })
      const group = groups.get(resource.group)!

      if (resource.type === 'sampler') {
        group.samplers.push(resource)
      } else if (resource.type === 'texture_2d') {
        group.textures.push(resource)
      } else if (structs.has(resource.type)) {
        group.buffers.push(resource)
      }
    })

    return { structs, resources, groups }
  }

  /**
   * Sets bind group resources at an index.
   */
  setBindGroupEntries(entries: GPUBindGroupEntry[], index = 0) {
    this.bindGroupEntries.set(index, entries)
  }

  /**
   * Disposes of render pipeline resources from GPU memory.
   */
  dispose() {
    this.bindGroupEntries.clear()
    this.bindGroups.clear()
  }
}

/**
 * Constructs a WebGPU texture.
 */
export class WebGPUTextureObject implements Disposable {
  readonly device: GPUDevice
  readonly format: GPUTextureFormat
  public sampler?: GPUSampler
  public target?: GPUTexture

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device
    this.format = format
  }

  /**
   * Updates the texture from `TextureOptions` with an optional `width` and `height`.
   */
  update(options: Texture | TextureOptions, width = options.image?.width ?? 0, height = options.image?.height ?? 0) {
    this.sampler = this.device.createSampler({
      addressModeU: GPU_TEXTURE_WRAPPINGS[options.wrapS] as GPUAddressMode,
      addressModeV: GPU_TEXTURE_WRAPPINGS[options.wrapT] as GPUAddressMode,
      magFilter: GPU_TEXTURE_FILTERS[options.magFilter],
      minFilter: GPU_TEXTURE_FILTERS[options.minFilter],
      mipmapFilter: options.generateMipmaps ? GPU_TEXTURE_FILTERS[options.minFilter] : undefined,
      maxAnisotropy: options.anisotropy,
    })

    this.target = this.device.createTexture({
      format: this.format,
      dimension: '2d',
      size: [width, height, 1],
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_SRC,
      mipLevelCount: options.generateMipmaps ? Math.floor(Math.log2(Math.max(width, height))) + 1 : undefined,
    })

    if (options.image) {
      this.device.queue.copyExternalImageToTexture(
        { source: options.image, flipY: options.flipY },
        { texture: this.target },
        [options.image.width, options.image.height],
      )
    }
  }

  /**
   * Disposes of the texture from GPU memory.
   */
  dispose() {
    this.target?.destroy()
  }
}

/**
 * Constructs a WebGPU FBO with MRT and multi-sampling.
 */
export class WebGPUFBO implements Disposable {
  readonly device: GPUDevice
  readonly width: number
  readonly height: number
  readonly count: number
  readonly samples: number
  readonly depthTexture: GPUTexture
  readonly depthTextureView: GPUTextureView
  readonly views: GPUTextureView[] = []

  constructor(
    device: GPUDevice,
    width: number,
    height: number,
    count = 1,
    samples = 0,
    textures: WebGPUTextureObject[] = [],
  ) {
    this.device = device
    this.width = width
    this.height = height
    this.count = count
    this.samples = samples
    this.depthTexture = this.device.createTexture({
      size: [this.width, this.height, 1],
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    this.depthTextureView = this.depthTexture.createView()
    this.views = textures.map((texture) => texture.target!.createView())
  }

  /**
   * Disposes of the FBO from GPU memory.
   */
  dispose() {
    this.depthTexture.destroy()
  }
}

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
   * An optional WebGPU device to request from.
   */
  device: GPUDevice
  /**
   * An optional GPUFormat to create texture views with.
   */
  format: GPUTextureFormat
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
  public device!: GPUDevice
  public context!: GPUCanvasContext
  public format!: GPUTextureFormat

  protected _params: Partial<Omit<WebGPURendererOptions, 'canvas'>>
  protected _bufferAttributes = new Compiled<WebGPUBufferAttributes>()
  protected _pipelines = new Compiled<WebGPURenderPipeline>()
  protected _textures = new Compiled<WebGPUTextureObject>()
  protected _FBOs = new Compiled<WebGPUFBO>()
  private _depthTexture!: GPUTexture
  private _depthTextureView!: GPUTextureView
  private _renderPass: GPURenderPassDescriptor | null = null

  constructor({
    canvas = document.createElement('canvas'),
    context,
    format,
    device,
    ...params
  }: Partial<WebGPURendererOptions> = {}) {
    super()

    this.canvas = canvas
    this.context = context ?? this.canvas.getContext('webgpu')!
    this.format = format ?? navigator.gpu.getPreferredCanvasFormat()

    if (device) this.device = device
    this._params = params

    this.setSize(canvas.width, canvas.height)
  }

  setSize(width: number, height: number) {
    super.setSize(width, height)

    // Resize swap chain after init
    if (this.device) {
      this.context.configure({
        device: this.device,
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        alphaMode: 'premultiplied',
      })

      if (this._depthTexture) this._depthTexture.destroy()
      this._depthTexture = this.device.createTexture({
        size: [this.viewport.width, this.viewport.height, 1],
        format: 'depth24plus-stencil8',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      this._depthTextureView = this._depthTexture.createView()
    }
  }

  /**
   * Initializes the internal WebGPU context and swapchain.
   */
  async init() {
    if (this.device) return this

    // Create device
    const adapter = await navigator.gpu.requestAdapter(this._params)
    this.device = await adapter!.requestDevice(this._params)

    // Resize swapchain
    this.setSize(this.canvas.width, this.canvas.height)

    return this
  }

  /**
   * Updates a buffer.
   */
  writeBuffer(buffer: GPUBuffer, data: Float32Array | Uint32Array) {
    this.device.queue.writeBuffer(buffer, 0, data)
  }

  /**
   * Creates buffer and initializes it.
   */
  createBuffer(data: Float32Array | Uint32Array, usage: GPUBufferUsageFlags) {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    })

    // @ts-ignore Map packed buffer
    new data.constructor(buffer.getMappedRange()).set(data)
    buffer.unmap()

    return buffer
  }

  compile(target: Mesh, camera?: Camera) {
    // Update built-ins
    target.material.uniforms.modelMatrix = target.matrix

    if (camera) {
      target.material.uniforms.projectionMatrix = camera.projectionMatrix
      target.material.uniforms.viewMatrix = camera.viewMatrix
      target.material.uniforms.normalMatrix = target.normalMatrix

      target.modelViewMatrix.copy(camera.viewMatrix).multiply(target.matrix)
      target.normalMatrix.getNormalMatrix(target.modelViewMatrix)
    }

    // Create pipeline and initial layout on first compile
    if (!this._pipelines.has(target)) {
      const pipeline = new WebGPURenderPipeline(this.device, this.format)
      this._pipelines.set(target, pipeline)

      const bindInfo = pipeline.getBindGroupInfo(target.material.vertex, target.material.fragment)
      bindInfo.groups.forEach((group, groupIndex) => {
        const entries: GPUBindGroupEntry[] = []

        // Bind textures and their samplers
        for (const textureResource of group.textures) {
          const textureIndex = group.textures.indexOf(textureResource)
          const sampler = group.samplers[textureIndex]

          const uniform = target.material.uniforms[textureResource.name] as Texture
          if (!this._textures.has(uniform)) {
            const texture = new WebGPUTextureObject(this.device, this.format)
            this._textures.set(uniform, texture)
          }

          const texture = this._textures.get(uniform)!
          if (uniform.needsUpdate) {
            texture.update(uniform)
            uniform.needsUpdate = false
          }

          entries.push(
            {
              binding: sampler.binding,
              resource: texture.sampler!,
            },
            {
              binding: textureResource.binding,
              resource: texture.target!.createView(),
            },
          )
        }

        // Bind UBOs
        for (const buffer of group.buffers) {
          const struct = bindInfo.structs.get(buffer.type)!
          const uniforms = Array.from(struct.children).reduce(
            (acc, { name }) => ({ ...acc, [name]: target.material.uniforms[name] }),
            {},
          )

          const UBO = new WebGPUUniformBuffer(this.device, uniforms)
          pipeline.UBOs.set(buffer.name, UBO)
          entries.push({ binding: buffer.binding, resource: { buffer: UBO.buffer } })
        }

        pipeline.setBindGroupEntries(entries, groupIndex)
      })
    }

    // Create buffer attribute collection on first compile
    if (!this._bufferAttributes.get(target.geometry)) {
      this._bufferAttributes.set(target.geometry, new WebGPUBufferAttributes(this.device, target.geometry.attributes))
    }
    const bufferAttributes = this._bufferAttributes.get(target.geometry)!
    bufferAttributes.update(target.geometry.attributes)

    // Update pipeline state
    const pipeline = this._pipelines.get(target)!
    // @ts-ignore
    const colorAttachments = this._renderPass?.colorAttachments.length ?? 1
    pipeline.update(target, bufferAttributes, colorAttachments)

    // Update uniforms
    pipeline.UBOs.forEach((UBO) => UBO.update(target.material.uniforms))

    for (const name in target.material.uniforms) {
      const uniform = target.material.uniforms[name]
      if (uniform instanceof Texture && this._textures.has(uniform)) {
        const texture = this._textures.get(uniform)!

        if (uniform.needsUpdate) {
          texture.update(uniform)
          uniform.needsUpdate = false
        }
      }
    }

    return { pipeline, bufferAttributes }
  }

  /**
   * Compiles and binds a render target to render into.
   */
  setRenderTarget(renderTarget: RenderTarget | null) {
    if (!renderTarget) return void (this._renderPass = null)

    if (!this._FBOs.has(renderTarget)) {
      const textures = renderTarget.textures.map((texture) => {
        if (!this._textures.has(texture)) {
          this._textures.set(texture, new WebGPUTextureObject(this.device, this.format))
        }

        const compiled = this._textures.get(texture)!
        if (texture.needsUpdate) {
          compiled.update(texture, renderTarget.width, renderTarget.height)
          texture.needsUpdate = false
        }

        return compiled
      })

      this._FBOs.set(
        renderTarget,
        new WebGPUFBO(
          this.device,
          renderTarget.width,
          renderTarget.height,
          renderTarget.count,
          renderTarget.samples,
          textures,
        ),
      )
    }

    const compiled = this._FBOs.get(renderTarget)!

    this._renderPass = {
      colorAttachments: compiled.views.map((view) => ({
        view,
        clearValue: {
          r: this.clearColor.r * this.clearAlpha,
          g: this.clearColor.g * this.clearAlpha,
          b: this.clearColor.b * this.clearAlpha,
          a: this.clearAlpha,
        },
        loadOp: 'clear',
        storeOp: 'store',
      })),
      depthStencilAttachment: {
        view: compiled.depthTextureView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: 'clear',
        stencilStoreOp: 'store',
      },
    }
  }

  render(scene: Object3D, camera?: Camera) {
    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass(
      this._renderPass ?? {
        colorAttachments: [
          {
            view: this.context.getCurrentTexture().createView(),
            clearValue: {
              r: this.clearColor.r * this.clearAlpha,
              g: this.clearColor.g * this.clearAlpha,
              b: this.clearColor.b * this.clearAlpha,
              a: this.clearAlpha,
            },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: this._depthTextureView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
          stencilClearValue: 0,
          stencilLoadOp: 'clear',
          stencilStoreOp: 'store',
        },
      },
    )

    // Update drawing area
    passEncoder.setViewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, 0, 1)
    passEncoder.setScissorRect(this.scissor.x, this.scissor.y, this.scissor.width, this.scissor.height)

    // Update scene matrices
    if (scene.autoUpdate) scene.updateMatrix()

    // Update camera matrices
    if (camera?.autoUpdate) {
      if (camera.parent === null) camera.updateMatrix()
      camera.updateProjectionMatrix(false)
    }

    // Sort and compile children
    const renderList = this.sort(scene, camera)
    const compiled = renderList.map((child) => this.compile(child, camera))

    for (let i = 0; i < renderList.length; i++) {
      const child = renderList[i]
      const { pipeline, bufferAttributes } = compiled[i]

      // Bind
      pipeline.bind(passEncoder)
      bufferAttributes.bind(passEncoder)

      // Alternate drawing for indexed and non-indexed children
      const { index, position } = child.geometry.attributes
      if (index) {
        passEncoder.drawIndexed(index.data.length / index.size)
      } else {
        passEncoder.draw(position.data.length / position.size)
      }
    }

    // Cleanup frame, submit GL commands
    passEncoder.end()
    this.device.queue.submit([commandEncoder.finish()])
  }

  dispose() {
    this._depthTexture.destroy()
    this.device.destroy()
  }
}
