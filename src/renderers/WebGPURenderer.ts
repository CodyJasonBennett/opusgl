/// <reference types="@webgpu/types" />
import { Compiled, Renderer } from '../core/Renderer'
import { Texture } from '../core/Texture'
import type { TextureFilter, TextureWrapping } from '../core/Texture'
import type { TextureOptions } from '../core/Texture'
import type { RenderTarget } from '../core/RenderTarget'
import type { AttributeData, AttributeList, Geometry } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Camera } from '../core/Camera'
import type { Object3D } from '../core/Object3D'
import type {
  BlendFactor,
  BlendOperation,
  CullSide,
  DrawMode,
  Material,
  MaterialOptions,
  Uniform,
  UniformList,
} from '../core/Material'
import { cloneUniform, uniformsEqual } from '../utils'

const GPU_BLEND_OPERATIONS: Record<BlendOperation, string> = {
  add: 'add',
  subtract: 'subtract',
  'reverse-subtract': 'reverse-subtract',
  min: 'min',
  max: 'max',
} as const

const GPU_BLEND_FACTORS: Record<BlendFactor, string> = {
  zero: 'zero',
  one: 'one',
  src: 'src',
  'one-minus-src': 'one-minus-src',
  'src-alpha': 'src-alpha',
  'one-minus-src-alpha': 'one-minus-src-alpha',
  dst: 'dst',
  'one-minus-dst': 'one-minus-dst',
  'dst-alpha': 'dst-alpha',
  'one-minus-dst-alpha': 'one-minus-dst-alpha',
  'src-alpha-saturated': 'src-alpha-saturated',
  constant: 'constant',
  'one-minus-constant': 'one-minus-constant',
} as const

const GPU_TEXTURE_FILTERS: Record<TextureFilter, string> = {
  nearest: 'nearest',
  linear: 'linear',
} as const

const GPU_TEXTURE_WRAPPINGS: Record<TextureWrapping, string> = {
  clamp: 'clamp-to-edge',
  repeat: 'repeat',
}

const GPU_CULL_SIDES: Record<CullSide, string> = {
  front: 'back',
  back: 'front',
  both: 'none',
} as const

const GPU_DRAW_MODES: Record<DrawMode, string> = {
  points: 'point-list',
  lines: 'line-list',
  triangles: 'triangle-list',
} as const

/**
 * Constructs a WebGPU buffer. Can be used to transmit binary data to the GPU.
 */
export class WebGPUBufferObject {
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
  write(data: AttributeData, byteLength = data.byteLength, srcByteOffset = 0, dstByteOffset = data.byteOffset): void {
    this.device.queue.writeBuffer(
      this.buffer,
      dstByteOffset,
      data,
      srcByteOffset / data.BYTES_PER_ELEMENT,
      byteLength / data.BYTES_PER_ELEMENT,
    )
  }

  /**
   * Disposes the buffer from GPU memory.
   */
  dispose(): void {
    this.buffer.destroy()
  }
}

// Pad to 16 byte chunks of 2, 4 (std140 layout)
const pad2 = (n: number): number => n + (n % 2)
const pad4 = (n: number): number => n + ((4 - (n % 4)) % 4)

/**
 * Constructs a WebGPU uniform buffer. Packs uniforms into a buffer via std140.
 */
export class WebGPUUniformBuffer extends WebGPUBufferObject {
  readonly uniforms: Map<string, { offset: number; value?: Uniform }>
  readonly data: Float32Array

  constructor(device: GPUDevice, uniforms: UniformList) {
    // Memoize uniforms
    const memoizedUniforms = new Map()
    let offset = 0
    for (const name in uniforms) {
      const uniform = uniforms[name]
      if (uniform instanceof Texture) continue

      if (typeof uniform === 'number') {
        memoizedUniforms.set(name, { offset })
        offset += 1
      } else {
        const pad = uniform.length <= 2 ? pad2 : pad4
        offset = pad(offset)

        memoizedUniforms.set(name, { offset })
        offset += pad(uniform.length)
      }
    }

    const length = pad4(offset)
    const data = new Float32Array(length)

    super(device, data, GPUBufferUsage.UNIFORM)

    this.uniforms = memoizedUniforms
    this.data = data
  }

  /**
   * Updates packed uniforms.
   */
  update(uniforms: UniformList): void {
    this.uniforms.forEach((memoized, name) => {
      // Skip textures and unchanged uniforms
      const uniform = uniforms[name] as Exclude<Uniform, Texture>
      if (memoized.value != null && uniformsEqual(memoized.value, uniform)) return

      // Memoize new values
      memoized.value = cloneUniform(uniform, memoized.value)

      // Update buffer storage
      const length = typeof uniform === 'number' ? 1 : uniform.length
      if (typeof uniform === 'number') this.data[memoized.offset] = uniform
      else this.data.set(uniform, memoized.offset)

      // Write to buffer
      const byteLength = length * this.data.BYTES_PER_ELEMENT
      const byteOffset = memoized.offset * this.data.BYTES_PER_ELEMENT
      this.write(this.data, byteLength, byteOffset, byteOffset)
    })
  }

  dispose(): void {
    super.dispose()
    this.uniforms.clear()
  }
}

/**
 * Represents a WebGPU buffer attribute and its layout properties.
 */
export interface WebGPUBufferAttribute extends Partial<GPUVertexBufferLayout> {
  slot?: number
  indexFormat?: GPUIndexFormat
  buffer: WebGPUBufferObject
}

/**
 * Constructs a WebGPU buffer attribute manager.
 */
export class WebGPUBufferAttributes {
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

  bind(passEncoder: GPURenderPassEncoder): void {
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
  update(attributes: AttributeList): void {
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
  dispose(): void {
    this.attributes.forEach(({ buffer }) => buffer.dispose())
    this.attributes.clear()
  }
}

/**
 * Represents a bind group node entry.
 */
export interface BindGroupInfoNode {
  name: string
  type: string
}
/**
 * Represents a bind group struct and its descendants.
 */
export interface BindGroupInfoStruct extends Omit<BindGroupInfoNode, 'type'> {
  type: 'struct'
  children: BindGroupInfoNode[]
}
/**
 * Represents a bind group resource and its layout properties
 */
export interface BindGroupInfoResource extends BindGroupInfoNode {
  binding: number
  group: number
}
/**
 * Represents a bind group and its entries by type.
 */
export interface BindGroupInfoGroup {
  samplers: BindGroupInfoResource[]
  textures: BindGroupInfoResource[]
  buffers: BindGroupInfoResource[]
}
/**
 * Represents pipeline bind group info.
 */
export interface BindGroupInfo {
  structs: Map<string, BindGroupInfoStruct>
  resources: Map<string, BindGroupInfoResource>
  groups: Map<number, BindGroupInfoGroup>
}

/**
 * Constructs a WebGPU render pipeline. Manages program state and bindings.
 */
export class WebGPURenderPipeline {
  readonly device: GPUDevice
  readonly format: GPUTextureFormat
  readonly bindGroups: Map<number, GPUBindGroup> = new Map()
  readonly bindGroupEntries: Map<number, GPUBindGroupEntry[]> = new Map()
  readonly UBOs: Map<string, WebGPUUniformBuffer> = new Map()
  public pipeline?: GPURenderPipeline

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device
    this.format = format
  }

  /**
   * Binds the render pipeline and its attachments to a render pass encoder.
   */
  bind(passEncoder: GPURenderPassEncoder): void {
    if (!this.pipeline) return

    passEncoder.setPipeline(this.pipeline)
    this.bindGroups.forEach((bindGroup, index) => {
      passEncoder.setBindGroup(index, bindGroup)
    })
  }

  /**
   * Updates pipeline state against a mesh and its attributes.
   */
  update(options: Material | MaterialOptions, bufferAttributes: WebGPUBufferAttributes, colorAttachments = 1): void {
    const pipelineState = {
      transparent: !!options.transparent,
      cullMode: GPU_CULL_SIDES[options.side ?? 'front'],
      topology: GPU_DRAW_MODES[options.mode ?? 'triangles'],
      depthWriteEnabled: !!options.depthWrite,
      depthCompare: (options.depthTest ? 'less' : 'always') as GPUCompareFunction,
      attributeCount: Array.from(bufferAttributes.attributes.keys()),
      blending: JSON.stringify(options.blending),
      colorAttachments,
    }
    const pipelineCacheKey = JSON.stringify(pipelineState)
    if (this.pipeline?.label === pipelineCacheKey) return

    const buffers: GPUVertexBufferLayout[] = []
    bufferAttributes.attributes.forEach((attribute, name) => {
      if (name === 'index') return
      buffers.push(attribute as GPUVertexBufferLayout)
    })

    this.pipeline = this.device.createRenderPipeline({
      label: pipelineCacheKey,
      vertex: {
        module: this.device.createShaderModule({ code: options.vertex }),
        entryPoint: 'main',
        buffers,
      },
      fragment: {
        module: this.device.createShaderModule({ code: options.fragment }),
        entryPoint: 'main',
        targets: Array(colorAttachments).fill({
          format: this.format,
          blend: options.blending
            ? {
                color: {
                  operation: GPU_BLEND_OPERATIONS[options.blending.color.operation!],
                  srcFactor: GPU_BLEND_FACTORS[options.blending.color.srcFactor!],
                  dstFactor: GPU_BLEND_FACTORS[options.blending.color.srcFactor!],
                },
                alpha: {
                  operation: GPU_BLEND_OPERATIONS[options.blending.alpha.operation!],
                  srcFactor: GPU_BLEND_FACTORS[options.blending.alpha.srcFactor!],
                  dstFactor: GPU_BLEND_FACTORS[options.blending.alpha.srcFactor!],
                },
              }
            : undefined,
          writeMask: GPUColorWrite.ALL,
        } as GPUColorTargetState),
      },
      primitive: {
        frontFace: 'ccw',
        cullMode: pipelineState.cullMode as GPUCullMode,
        topology: pipelineState.topology as GPUPrimitiveTopology,
      },
      depthStencil: {
        depthWriteEnabled: pipelineState.depthWriteEnabled,
        depthCompare: pipelineState.depthCompare,
        format: 'depth24plus-stencil8',
      },
      layout: 'auto',
    })

    this.bindGroupEntries.forEach((entries, index) => {
      const bindGroup = this.device.createBindGroup({
        layout: this.pipeline!.getBindGroupLayout(index),
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

      const children: BindGroupInfoNode[] = []
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
      let group = groups.get(resource.group)
      if (!group) {
        group = { samplers: [], textures: [], buffers: [] }
        groups.set(resource.group, group)
      }

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
  setBindGroupEntries(entries: GPUBindGroupEntry[], index = 0): void {
    this.bindGroupEntries.set(index, entries)
  }

  /**
   * Disposes of render pipeline resources from GPU memory.
   */
  dispose(): void {
    this.bindGroupEntries.clear()
    this.bindGroups.clear()
    this.UBOs.clear()
  }
}

/**
 * Constructs a WebGPU texture.
 */
export class WebGPUTextureObject {
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
  update(
    options: Texture | TextureOptions,
    width = options.image?.width ?? 0,
    height = options.image?.height ?? 0,
  ): void {
    this.sampler = this.device.createSampler({
      addressModeU: GPU_TEXTURE_WRAPPINGS[options.wrapS] as GPUAddressMode,
      addressModeV: GPU_TEXTURE_WRAPPINGS[options.wrapT] as GPUAddressMode,
      magFilter: GPU_TEXTURE_FILTERS[options.magFilter] as GPUFilterMode,
      minFilter: GPU_TEXTURE_FILTERS[options.minFilter] as GPUFilterMode,
      mipmapFilter: options.generateMipmaps
        ? (GPU_TEXTURE_FILTERS[options.minFilter] as GPUMipmapFilterMode)
        : undefined,
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
      this.device.queue.copyExternalImageToTexture({ source: options.image }, { texture: this.target }, [
        options.image.width,
        options.image.height,
      ])
    }
  }

  /**
   * Disposes of the texture from GPU memory.
   */
  dispose(): void {
    this.target?.destroy()
  }
}

/**
 * Constructs a WebGPU FBO with MRT and multi-sampling.
 */
export class WebGPUFBO {
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
  dispose(): void {
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

  /**
   * Whether to clear the drawing buffer between renders. Default is `true`.
   */
  public autoClear = true

  protected _params: Partial<Omit<WebGPURendererOptions, 'canvas'>>
  protected _bufferAttributes = new Compiled<Geometry, WebGPUBufferAttributes>()
  protected _pipelines = new Compiled<Material, WebGPURenderPipeline>()
  protected _textures = new Compiled<Texture, WebGPUTextureObject>()
  protected _FBOs = new Compiled<RenderTarget, WebGPUFBO>()
  protected _depthTexture!: GPUTexture
  protected _depthTextureView!: GPUTextureView

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

  setSize(width: number, height: number): void {
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
  async init(): Promise<this> {
    if (this.device) return this

    // Create device
    const adapter = await navigator.gpu.requestAdapter(this._params)
    this.device = await adapter!.requestDevice(this._params)

    // Resize swapchain
    this.setSize(this.canvas.width, this.canvas.height)

    return this
  }

  compile(target: Mesh, camera?: Camera): void {
    // Update built-ins
    target.material.uniforms.modelMatrix = target.matrix

    if (camera) {
      target.material.uniforms.projectionMatrix = camera.projectionMatrix
      target.material.uniforms.viewMatrix = camera.viewMatrix
      target.material.uniforms.normalMatrix = target.normalMatrix
      target.material.uniforms.modelViewMatrix = target.modelViewMatrix

      target.modelViewMatrix.copy(camera.viewMatrix).multiply(target.matrix)
      target.normalMatrix.getNormalMatrix(target.modelViewMatrix)
    }

    // Create pipeline and initial layout on first compile
    let pipeline = this._pipelines.get(target.material)
    if (!pipeline) {
      pipeline = new WebGPURenderPipeline(this.device, this.format)
      this._pipelines.set(target.material, pipeline)

      const bindInfo = pipeline.getBindGroupInfo(target.material.vertex, target.material.fragment)
      bindInfo.groups.forEach((group, groupIndex) => {
        const entries: GPUBindGroupEntry[] = []

        // Bind textures and their samplers
        for (const textureResource of group.textures) {
          const textureIndex = group.textures.indexOf(textureResource)
          const sampler = group.samplers[textureIndex]

          const uniform = target.material.uniforms[textureResource.name]
          if (!(uniform instanceof Texture)) continue

          let compiled = this._textures.get(uniform)
          if (!compiled) {
            compiled = new WebGPUTextureObject(this.device, this.format)
            this._textures.set(uniform, compiled)
          }

          if (uniform.needsUpdate) {
            compiled.update(uniform)
            uniform.needsUpdate = false
          }

          entries.push(
            {
              binding: sampler.binding,
              resource: compiled.sampler!,
            },
            {
              binding: textureResource.binding,
              resource: compiled.target!.createView(),
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
          pipeline!.UBOs.set(buffer.name, UBO)
          entries.push({ binding: buffer.binding, resource: { buffer: UBO.buffer } })
        }

        pipeline!.setBindGroupEntries(entries, groupIndex)
      })
    }

    // Create buffer attribute collection on first compile
    if (!this._bufferAttributes.get(target.geometry)) {
      this._bufferAttributes.set(target.geometry, new WebGPUBufferAttributes(this.device, target.geometry.attributes))
    }
    const bufferAttributes = this._bufferAttributes.get(target.geometry)!
    bufferAttributes.update(target.geometry.attributes)

    // Update pipeline state
    pipeline.update(target.material, bufferAttributes, this._renderTarget?.count ?? 1)

    // Update uniforms
    pipeline.UBOs.forEach((UBO) => UBO.update(target.material.uniforms))

    for (const name in target.material.uniforms) {
      const uniform = target.material.uniforms[name]
      if (!(uniform instanceof Texture)) continue

      const compiled = this._textures.get(uniform)
      if (compiled && uniform.needsUpdate) {
        compiled.update(uniform)
        uniform.needsUpdate = false
      }
    }
  }

  render(scene: Object3D, camera?: Camera): void {
    // Compile render target
    let FBO = this._FBOs.get(this._renderTarget!)
    if (this._renderTarget && !FBO) {
      const { width, height, count, samples } = this._renderTarget

      const textures = this._renderTarget.textures.map((texture) => {
        let compiled = this._textures.get(texture)
        if (!compiled) {
          compiled = new WebGPUTextureObject(this.device, this.format)
          this._textures.set(texture, compiled)
        }

        if (texture.needsUpdate) {
          compiled.update(texture, width, height)
          texture.needsUpdate = false
        }

        return compiled
      })

      FBO = new WebGPUFBO(this.device, width, height, count, samples, textures)
      this._FBOs.set(this._renderTarget, FBO)
    }

    // Set render target
    const renderViews = FBO?.views ?? [this.context.getCurrentTexture().createView()]
    const depthView = FBO?.depthTextureView ?? this._depthTextureView
    const loadOp: GPULoadOp = this.autoClear ? 'clear' : 'load'

    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: renderViews.map((view) => ({
        view,
        clearValue: {
          r: this.clearColor.r * this.clearAlpha,
          g: this.clearColor.g * this.clearAlpha,
          b: this.clearColor.b * this.clearAlpha,
          a: this.clearAlpha,
        },
        loadOp,
        storeOp: 'store',
      })),
      depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1,
        depthLoadOp: loadOp,
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: loadOp,
        stencilStoreOp: 'store',
      },
    })

    // Update drawing area
    if (this._renderTarget) passEncoder.setViewport(0, 0, this._renderTarget.width, this._renderTarget.height, 0, 1)
    else passEncoder.setViewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, 0, 1)
    passEncoder.setScissorRect(this.scissor.x, this.scissor.y, this.scissor.width, this.scissor.height)

    // Update scene matrices
    if (scene.autoUpdate) scene.updateMatrix()

    // Update camera matrices
    if (camera?.autoUpdate) {
      if (camera.parent === null) camera.updateMatrix()
      camera.updateProjectionMatrix(false)
      camera.updateFrustum(false)
    }

    // Sort and compile children
    const renderList = this.sort(scene, camera)

    for (let i = 0; i < renderList.length; i++) {
      const child = renderList[i]
      this.compile(child, camera)

      const pipeline = this._pipelines.get(child.material)!
      const bufferAttributes = this._bufferAttributes.get(child.geometry)!

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

  dispose(): void {
    this._depthTexture.destroy()
    this.device.destroy()
  }
}
