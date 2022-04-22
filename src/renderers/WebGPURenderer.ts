/// <reference types="@webgpu/types" />
import { Disposable, Compiled, Renderer } from '../core/Renderer'
import { Program } from '../core/Program'
import { Texture } from '../core/Texture'
import type { RenderTarget } from '../core/RenderTarget'
import type { Uniform } from '../core/Program'
import type { Geometry } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Camera } from '../core/Camera'
import type { Object3D } from '../core/Object3D'
import { GPU_CULL_SIDES, GPU_DRAW_MODES, GPU_TEXTURE_FILTERS, GPU_TEXTURE_WRAPPINGS } from '../constants'
import { cloneUniform, parseUniforms, std140, uniformsEqual } from '../utils'

export type GPUAttribute = Partial<GPUVertexBufferLayout> & { slot?: number; buffer: GPUBuffer }
export type GPUAttributeMap = Map<string, GPUAttribute>

export interface GPUCompiled extends Disposable {
  transparent: boolean
  cullMode: keyof typeof GPU_CULL_SIDES
  topology: keyof typeof GPU_DRAW_MODES
  depthWriteEnabled: boolean
  depthCompare: GPUCompareFunction
  pipeline: GPURenderPipeline
  attributes: Map<string, Partial<GPUVertexBufferLayout> & { slot?: number; buffer: GPUBuffer }>
  UBO: {
    uniforms: Map<string, Uniform>
    data?: Float32Array
    buffer?: GPUBuffer
    bindGroup?: GPUBindGroup
  }
}

export interface GPUTextureImpl extends Disposable {
  sampler: GPUSampler
  target: GPUTexture
}

export interface GPURenderTarget extends Disposable {
  depthTexture: GPUTexture
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
  public adapter!: GPUAdapter
  public device!: GPUDevice
  public context!: GPUCanvasContext
  public format!: GPUTextureFormat

  protected _params: Partial<Omit<WebGPURendererOptions, 'canvas'>>
  protected _compiled = new Compiled<GPUCompiled>()
  protected _textures = new Compiled<GPUTextureImpl>()
  protected _renderTargets = new Compiled<GPURenderTarget>()
  private _depthTexture!: GPUTexture
  private _depthTextureView!: GPUTextureView
  private _renderPass: GPURenderPassDescriptor | null = null

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

  setSize(width: number, height: number) {
    super.setSize(width, height)

    // Resize swap chain after init
    if (this.device) {
      this.context.configure({
        device: this.device,
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        size: [this.viewport.width, this.viewport.height, 1],
        compositingAlphaMode: 'premultiplied',
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
    // Check for compatibility
    const isSupported = typeof window !== 'undefined' && 'gpu' in navigator
    if (!isSupported) throw 'WebGPU is not supported on this device!'

    // Init API
    this.adapter = (await navigator.gpu.requestAdapter(this._params))!
    this.device = await this.adapter.requestDevice(this._params)

    // Init GL
    this.context = this.canvas.getContext('webgpu')!
    this.format = this.context.getPreferredFormat(this.adapter)

    // Resize swapchain
    this.setSize(this.canvas.width, this.canvas.height)

    return this
  }

  /**
   * Creates buffer and initializes it.
   */
  writeBuffer(buffer: GPUBuffer, data: Float32Array | Uint32Array) {
    this.device.queue.writeBuffer(buffer, 0, data)
    return buffer
  }

  /**
   * Updates a buffer.
   */
  createBuffer(data: Float32Array | Uint32Array, usage: GPUBufferUsageFlags) {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    })

    // @ts-expect-error Map packed buffer
    new data.constructor(buffer.getMappedRange()).set(data)
    buffer.unmap()

    return buffer
  }

  protected updateAttributes(geometry: Geometry | Program) {
    const { attributes } = this._compiled.get(geometry)!

    attributes.forEach((compiled, name) => {
      if (name === 'index') return

      const attribute = geometry.attributes[name]
      if (!attribute.needsUpdate) return

      this.writeBuffer(compiled.buffer, attribute.data)
    })

    return attributes
  }

  protected updateGeometry(target: Mesh | Program) {
    const geometry = target instanceof Program ? target : target.geometry

    let attributes: GPUAttributeMap

    if (this._compiled.has(geometry)) {
      attributes = this.updateAttributes(geometry)
    } else {
      attributes = new Map()

      let offset = 0
      Object.entries(geometry.attributes).forEach(([name, attribute], index) => {
        if (name === 'index') {
          offset -= 1
          const buffer = this.createBuffer(attribute.data, GPUBufferUsage.INDEX)
          attributes.set(name, { buffer })
        } else {
          const slot = index + offset
          const buffer = this.createBuffer(attribute.data, GPUBufferUsage.VERTEX)

          attributes.set(name, {
            slot,
            buffer,
            arrayStride: attribute.size * attribute.data.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: slot,
                offset: 0,
                format: `float32x${attribute.size}`,
              },
            ],
          } as GPUAttribute)
        }
      })

      if (!(target instanceof Program)) {
        this._compiled.set(geometry, {
          attributes,
          dispose: () => {
            attributes.forEach(({ buffer }) => buffer.destroy())
            attributes.clear()
          },
        } as GPUCompiled)
      }
    }

    return attributes
  }

  protected updatePipeline(target: Mesh | Program, attributes: GPUAttributeMap) {
    const material = target instanceof Program ? target : target.material

    const pipelineState = {
      transparent: material.transparent,
      cullMode: GPU_CULL_SIDES[material.side],
      topology: GPU_DRAW_MODES[target.mode],
      depthWriteEnabled: material.depthWrite,
      depthCompare: (material.depthTest ? 'less' : 'always') as GPUCompareFunction,
    }

    const compiledMesh = this._compiled.get(target)
    const needsUpdate =
      !compiledMesh ||
      Object.entries(pipelineState).some(([key, value]) => compiledMesh?.[key as keyof typeof pipelineState] !== value)

    let pipeline = this._compiled.get(target)?.pipeline

    if (needsUpdate) {
      const buffers: GPUAttribute[] = []
      attributes.forEach((attribute, name) => {
        if (name === 'index') return
        buffers.push(attribute)
      })

      // @ts-expect-error
      const colorAttachments = this._renderPass?.colorAttachments.length ?? 1

      pipeline = this.device.createRenderPipeline({
        vertex: {
          module: this.device.createShaderModule({ code: material.vertex }),
          entryPoint: 'main',
          buffers: buffers as GPUVertexBufferLayout[],
        },
        fragment: {
          module: this.device.createShaderModule({ code: material.fragment }),
          entryPoint: 'main',
          targets: Array(colorAttachments).fill({
            format: this.format,
            blend: pipelineState.transparent
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
          cullMode: pipelineState.cullMode,
          topology: pipelineState.topology,
        },
        depthStencil: {
          depthWriteEnabled: pipelineState.depthWriteEnabled,
          depthCompare: pipelineState.depthCompare,
          format: 'depth24plus-stencil8',
        },
      })

      if (!(target instanceof Program)) {
        this._compiled.set(target, {
          ...pipelineState,
          pipeline,
          dispose: () => {},
        } as unknown as GPUCompiled)
      }
    }

    return pipeline
  }

  /**
   * Compiles and activates a texture.
   */
  protected updateTexture(uniform: Texture) {
    const sampler = this.device.createSampler({
      addressModeU: GPU_TEXTURE_WRAPPINGS[uniform.wrapS] as GPUAddressMode,
      addressModeV: GPU_TEXTURE_WRAPPINGS[uniform.wrapT] as GPUAddressMode,
      magFilter: GPU_TEXTURE_FILTERS[uniform.magFilter],
      minFilter: GPU_TEXTURE_FILTERS[uniform.minFilter],
      mipmapFilter: uniform.generateMipmaps ? GPU_TEXTURE_FILTERS[uniform.minFilter] : undefined,
      maxAnisotropy: uniform.anisotropy,
    })

    const target = this.device.createTexture({
      format: this.format,
      dimension: '2d',
      size: [uniform.image!.width, uniform.image!.width, 1],
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_SRC,
      mipLevelCount: uniform.generateMipmaps
        ? Math.floor(Math.log2(Math.max(uniform.image!.width, uniform.image!.height))) + 1
        : undefined,
    })

    this.device.queue.copyExternalImageToTexture(
      { source: uniform.image!, flipY: uniform.flipY },
      { texture: target },
      [uniform.image!.width, uniform.image!.height],
    )

    uniform.needsUpdate = false

    return { sampler, target }
  }

  protected updateUniforms(pipeline: GPURenderPipeline, target: Mesh | Program) {
    const material = target instanceof Program ? target : target.material

    let UBO = this._compiled.get(material)?.UBO!

    if (!UBO) {
      UBO = { uniforms: new Map() }

      let binding = 0
      const entries: GPUBindGroupEntry[] = []

      // Parse used uniforms for std140
      const parsed = parseUniforms(material.vertex, material.fragment)
      if (parsed) {
        // Init parsed uniforms
        for (const name of parsed) {
          UBO.uniforms.set(name, cloneUniform(material.uniforms[name]))
        }

        // Create UBO
        UBO.data = std140(Array.from(UBO.uniforms.values()))
        UBO.buffer = this.createBuffer(UBO.data, GPUBufferUsage.UNIFORM)
        this.writeBuffer(UBO.buffer, UBO.data)

        binding = entries.push({
          binding,
          resource: {
            buffer: UBO.buffer,
          },
        })
      }

      for (const name in material.uniforms) {
        const uniform = material.uniforms[name]
        if (uniform instanceof Texture) {
          if (!this._textures.get(uniform) || uniform.needsUpdate) {
            const { sampler, target } = this.updateTexture(uniform)
            this._textures.set(uniform, {
              sampler,
              target,
              dispose: () => {
                target.destroy()
              },
            })
          }

          const { sampler, target } = this._textures.get(uniform)!

          binding = entries.push(
            {
              binding,
              resource: sampler,
            },
            {
              binding: binding + 1,
              resource: target.createView(),
            },
          )
        }
      }

      // Bind entries
      UBO.bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries,
      })

      if (!(target instanceof Program)) {
        this._compiled.set(material, {
          UBO,
          dispose: () => {
            if (UBO.buffer) UBO.buffer.destroy()
          },
        } as GPUCompiled)
      }
    } else {
      // Init layout
      let layoutNeedsUpdate = false
      let binding = 0
      const entries: GPUBindGroupEntry[] = []

      // Add UBO to layout if present
      if (UBO.buffer) {
        binding = entries.push({
          binding,
          resource: {
            buffer: UBO.buffer,
          },
        })
      }

      // Update textures flagged for update
      for (const name in material.uniforms) {
        const uniform = material.uniforms[name]
        if (uniform instanceof Texture && uniform.needsUpdate) {
          const prev = this._textures.get(uniform)!
          if (prev) prev.dispose()

          const { sampler, target } = this.updateTexture(uniform)

          this._textures.set(uniform, {
            sampler,
            target,
            dispose: () => {
              target.destroy()
            },
          })

          binding = entries.push(
            {
              binding,
              resource: sampler,
            },
            {
              binding: binding + 1,
              resource: target.createView(),
            },
          )

          layoutNeedsUpdate = true
        }
      }

      // If an entry changed, rebuild entire layout
      // TODO: investigate copying to previous texture queue
      if (layoutNeedsUpdate) {
        UBO.bindGroup = this.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries,
        })
      }

      // Check whether a uniform has changed
      let needsUpdate = false
      UBO.uniforms.forEach((value, name) => {
        const uniform = material.uniforms[name]
        if (!uniformsEqual(value, uniform)) {
          UBO.uniforms.set(name, cloneUniform(uniform))
          needsUpdate = true
        }
      })

      // If a uniform changed, rebuild entire buffer
      // TODO: expand writeBuffer to subdata at affected indices instead
      if (needsUpdate) {
        this.writeBuffer(UBO.buffer!, std140(Array.from(UBO.uniforms.values()), UBO.data))
      }
    }

    return UBO
  }

  /**
   * Compiles and binds a render target to render into.
   */
  setRenderTarget(renderTarget: RenderTarget | null) {
    if (!renderTarget) return void (this._renderPass = null)

    const views: GPUTextureView[] = []

    for (const texture of renderTarget.textures) {
      if (!this._textures.has(texture) || texture.needsUpdate) {
        const prev = this._textures.get(texture)
        if (prev) prev.target.destroy()

        const sampler = this.device.createSampler({
          magFilter: GPU_TEXTURE_FILTERS[texture.magFilter],
          minFilter: GPU_TEXTURE_FILTERS[texture.minFilter],
        })

        const target = this.device.createTexture({
          format: this.format,
          dimension: '2d',
          size: [renderTarget.width, renderTarget.height, 1],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        })

        texture.needsUpdate = false

        this._textures.set(texture, {
          sampler,
          target,
          dispose: () => {
            target.destroy()
          },
        })
      }

      const compiled = this._textures.get(texture)!
      views.push(compiled.target.createView())
    }

    const prev = this._renderTargets.get(renderTarget)
    if (prev) prev.dispose()

    const depthTexture = this.device.createTexture({
      size: [renderTarget.width, renderTarget.height, 1],
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    const depthTextureView = depthTexture.createView()

    this._renderTargets.set(renderTarget, {
      depthTexture,
      dispose: () => {
        depthTexture.destroy()
      },
    })

    this._renderPass = {
      colorAttachments: views.map((view) => ({
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
        view: depthTextureView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: 'clear',
        stencilStoreOp: 'store',
      },
    }
  }

  compile(target: Mesh | Program, camera?: Camera) {
    const isProgram = target instanceof Program

    // Update built-ins
    if (!isProgram) {
      target.material.uniforms.modelMatrix = target.matrix

      if (camera) {
        target.material.uniforms.projectionMatrix = camera.projectionMatrix
        target.material.uniforms.viewMatrix = camera.viewMatrix
        target.material.uniforms.normalMatrix = target.normalMatrix

        target.modelViewMatrix.copy(camera.viewMatrix).multiply(target.matrix)
        target.normalMatrix.getNormalMatrix(target.modelViewMatrix)
      }
    }

    const attributes = this.updateGeometry(target)
    const pipeline = this.updatePipeline(target, attributes)!
    const UBO = this.updateUniforms(pipeline, target)

    return { attributes, pipeline, UBO }
  }

  render(scene: Object3D | Program, camera?: Camera) {
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
    if (!(scene instanceof Program)) scene.updateMatrix()

    // Update camera matrices
    if (camera) camera.updateMatrix()

    // Render children
    const renderList = scene instanceof Program ? [scene] : this.sort(scene, camera)
    for (const child of renderList) {
      // Compile on first render, otherwise update
      const compiled = this.compile(child, camera)

      // Bind
      passEncoder.setPipeline(compiled.pipeline)
      if (compiled.UBO.bindGroup) passEncoder.setBindGroup(0, compiled.UBO.bindGroup)

      compiled.attributes.forEach((attribute, name) => {
        if (name === 'index') {
          passEncoder.setIndexBuffer(attribute.buffer, 'uint32')
        } else {
          passEncoder.setVertexBuffer(attribute.slot!, attribute.buffer)
        }
      })

      // Alternate drawing for indexed and non-indexed children
      const { index, position } = child instanceof Program ? child.attributes : child.geometry.attributes
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
