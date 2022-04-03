import { Disposable, Compiled, Renderer } from '../core/Renderer'
import { Program } from '../core/Program'
import type { Uniform } from '../core/Program'
import type { Geometry } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Camera } from '../core/Camera'
import type { Object3D } from '../core/Object3D'
import { GPU_CULL_SIDES, GPU_DRAW_MODES } from '../constants'
import { std140 } from '../utils'

export type GPUAttribute = Partial<GPUVertexBufferLayout> & { slot?: number; buffer: GPUBuffer }
export type GPUAttributeMap = Map<string, GPUAttribute>

export interface GPUCompiled extends Disposable {
  transparent: boolean
  cullMode: keyof typeof GPU_CULL_SIDES
  topology: keyof typeof GPU_DRAW_MODES
  depthWriteEnabled: boolean
  depthCompare: GPUCompareFunction
  pipeline: GPURenderPipeline
  attributes: GPUAttributeMap
  uniforms: Uniform[]
  UBO: { data: Float32Array; buffer: GPUBuffer; bindGroup: GPUBindGroup }
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

  setSize(width: number, height: number) {
    super.setSize(width, height)

    // Resize swap chain after init
    if (this.device) {
      this.context.configure({
        device: this.device,
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        size: {
          width: this.viewport.width,
          height: this.viewport.height,
          depthOrArrayLayers: 1,
        },
        compositingAlphaMode: 'premultiplied',
      })

      if (this._depthTexture) this._depthTexture.destroy()
      this._depthTexture = this.device.createTexture({
        size: {
          width: this.viewport.width,
          height: this.viewport.height,
          depthOrArrayLayers: 1,
        },
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

  updateAttributes(geometry: Geometry | Program) {
    const { attributes } = this._compiled.get(geometry)!

    attributes.forEach(({ buffer }, name) => {
      if (name === 'index') return

      const attribute = geometry.attributes[name]
      if (!attribute.needsUpdate) return

      this.writeBuffer(buffer, attribute.data)
    })

    return attributes
  }

  updateGeometry(target: Mesh | Program) {
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

  updatePipeline(target: Mesh | Program, attributes: GPUAttributeMap) {
    const material = target instanceof Program ? target : target.material

    const pipelineState = {
      transparent: material.transparent,
      cullMode: GPU_CULL_SIDES[material.side] ?? GPU_CULL_SIDES.front,
      topology: GPU_DRAW_MODES[target.mode] ?? GPU_DRAW_MODES.triangles,
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

      pipeline = this.device.createRenderPipeline({
        vertex: {
          module: this.device.createShaderModule({ code: material.vertex }),
          entryPoint: 'main',
          buffers: buffers as GPUVertexBufferLayout[],
        },
        fragment: {
          module: this.device.createShaderModule({ code: material.fragment }),
          entryPoint: 'main',
          targets: [
            {
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
            },
          ],
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

  updateUniforms(pipeline: GPURenderPipeline, target: Mesh | Program) {
    const material = target instanceof Program ? target : target.material

    let UBO = this._compiled.get(material)?.UBO

    if (this._compiled.has(material)) {
      const { uniforms, UBO } = this._compiled.get(material)!

      // Check whether a uniform has changed
      const needsUpdate = Object.values(material.uniforms).some(
        (uniform, i) => !this.uniformsEqual(uniforms?.[i], uniform),
      )

      // If a uniform changed, rebuild entire buffer
      // TODO: expand writeBuffer to subdata at affected indices instead
      if (needsUpdate) {
        this.writeBuffer(UBO.buffer, std140(Object.values(material.uniforms), UBO.data))
      }
    } else {
      // @ts-expect-error
      const uniforms: Uniform[] = Object.values(material.uniforms).map((uniform) => uniform?.clone?.() ?? uniform)
      const data = std140(uniforms)

      const buffer = this.createBuffer(data, GPUBufferUsage.UNIFORM)
      this.writeBuffer(buffer, data)

      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: {
              buffer,
            },
          },
        ],
      })

      UBO = { data, buffer, bindGroup }

      if (!(target instanceof Program)) {
        this._compiled.set(material, {
          uniforms,
          UBO,
          dispose: () => {},
        } as GPUCompiled)
      }
    }

    return UBO
  }

  compile(target: Mesh | Program, camera?: Camera) {
    const isProgram = target instanceof Program

    // Update built-ins
    if (!isProgram) {
      target.material.uniforms.modelMatrix = target.worldMatrix

      if (camera) {
        target.material.uniforms.projectionMatrix = camera.projectionMatrix
        target.material.uniforms.viewMatrix = camera.viewMatrix
        target.material.uniforms.normalMatrix = target.normalMatrix

        target.modelViewMatrix.copy(camera.viewMatrix).multiply(target.worldMatrix)
        target.normalMatrix.getNormalMatrix(target.modelViewMatrix)
      }
    }

    const attributes = this.updateGeometry(target)
    const pipeline = this.updatePipeline(target, attributes)!
    const UBO = this.updateUniforms(pipeline, target)

    return { attributes, pipeline, UBO }
  }

  render(scene: Object3D | Program, camera: Camera) {
    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: this.clearColor.r, g: this.clearColor.g, b: this.clearColor.b, a: this.clearAlpha },
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
    })

    // Update drawing area
    passEncoder.setViewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, 0, 1)
    passEncoder.setScissorRect(this.scissor.x, this.scissor.y, this.scissor.width, this.scissor.height)

    // Update scene matrices
    if (!(scene instanceof Program)) scene.updateMatrix()

    // Update camera matrices
    if (camera) {
      camera.updateMatrix()
      camera.updateProjectionMatrix()
    }

    // Render children
    const renderList = scene instanceof Program ? [scene] : this.sort(scene, camera)
    renderList.forEach((child) => {
      // Compile on first render, otherwise update
      const compiled = this.compile(child, camera)

      // Bind
      passEncoder.setPipeline(compiled.pipeline)
      passEncoder.setBindGroup(0, compiled.UBO!.bindGroup)
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
    })

    // Cleanup frame, submit GL commands
    passEncoder.end()
    this.device.queue.submit([commandEncoder.finish()])
  }

  dispose() {
    this._depthTexture.destroy()
    this.device.destroy()
  }
}
