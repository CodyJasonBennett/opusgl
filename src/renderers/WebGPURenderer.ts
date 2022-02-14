import { Renderer } from '../core/Renderer'
import type { Disposable } from '../utils'
import type { Material, Uniform } from '../core/Material'
import type { Geometry } from '../core/Geometry'
import type { Mesh } from '../core/Mesh'
import type { Camera } from '../core/Camera'
import type { Scene } from '../core/Scene'
import { compiled, compareUniforms } from '../utils'
import { GPU_CULL_SIDES, GPU_DRAW_MODES } from '../constants'

export type WebGPUMaterial = Disposable & {
  uniforms: Uniform[]
  uniformData: Float32Array
  uniformBuffer: GPUBuffer
  uniformBindGroup: GPUBindGroup
}

export type WebGPUAttribute = Partial<GPUVertexBufferLayout> & { slot?: number; buffer: GPUBuffer }
export type WebGPUAttributeMap = Map<string, WebGPUAttribute>
export type WebGPUGeometry = Disposable & { attributes: WebGPUAttributeMap }

export type WebGPUMesh = Disposable & {
  transparent: boolean
  cullMode: keyof typeof GPU_CULL_SIDES
  topology: keyof typeof GPU_DRAW_MODES
  depthWriteEnabled: boolean
  depthCompare: GPUCompareFunction
  pipeline: GPURenderPipeline
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
  public canvas!: HTMLCanvasElement
  public context!: GPUCanvasContext
  public format!: GPUTextureFormat

  private _params: Partial<Omit<WebGPURendererOptions, 'canvas'>>
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
    this.adapter = (await navigator.gpu.requestAdapter(this._params))!
    this.device = await this.adapter.requestDevice(this._params)

    // Init GL
    this.context = this.canvas.getContext('webgpu')!
    this.format = this.context.getPreferredFormat(this.adapter)
    this.context.configure({ device: this.device, format: this.format })

    // Init depth
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
      size: (data.byteLength + 3) & ~3, // align to 4 bytes
      usage: usage | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    })

    // @ts-expect-error Map packed buffer
    new data.constructor(buffer.getMappedRange()).set(data)
    buffer.unmap()

    return buffer
  }

  updateAttributes(geometry: Geometry) {
    const { attributes } = compiled.get(geometry.uuid)! as WebGPUGeometry

    attributes.forEach(({ buffer }, name) => {
      if (name === 'index') return

      const attribute = geometry.attributes[name]
      if (!attribute.needsUpdate) return

      this.writeBuffer(buffer, attribute.data)
    })

    return attributes
  }

  updateGeometry(geometry: Geometry) {
    let attributes: WebGPUAttributeMap

    if (compiled.has(geometry.uuid)) {
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
          } as WebGPUAttribute)
        }
      })

      compiled.set(geometry.uuid, {
        attributes,
        dispose: () => {
          attributes.forEach(({ buffer }) => buffer.destroy())
          attributes.clear()
        },
      } as WebGPUGeometry)
    }

    return attributes
  }

  updatePipeline(attributes: WebGPUAttributeMap, mesh: Mesh) {
    let pipeline = compiled.get(mesh.uuid)?.pipeline as GPURenderPipeline

    const pipelineState = {
      transparent: mesh.material.transparent,
      cullMode: GPU_CULL_SIDES[mesh.material.side] ?? GPU_CULL_SIDES.both,
      topology: GPU_DRAW_MODES[mesh.mode] ?? GPU_DRAW_MODES.triangles,
      depthWriteEnabled: mesh.material.depthWrite,
      depthCompare: (mesh.material.depthTest ? 'less' : 'always') as GPUCompareFunction,
    }

    const compiledMesh = compiled.get(mesh.uuid) as WebGPUMesh | undefined
    const needsUpdate =
      !compiledMesh || Object.entries(pipelineState).some(([key, value]) => compiledMesh?.[key] !== value)

    if (needsUpdate) {
      const buffers: WebGPUAttribute[] = []
      attributes.forEach((attribute, name) => {
        if (name === 'index') return
        buffers.push(attribute)
      })

      pipeline = this.device.createRenderPipeline({
        vertex: {
          module: this.device.createShaderModule({ code: mesh.material.vertex }),
          entryPoint: 'main',
          buffers: buffers as GPUVertexBufferLayout[],
        },
        fragment: {
          module: this.device.createShaderModule({ code: mesh.material.fragment }),
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

      compiled.set(mesh.uuid, {
        ...pipelineState,
        pipeline,
        dispose: () => {},
      } as unknown as WebGPUMesh)
    }

    return pipeline
  }

  updateUniforms(pipeline: GPURenderPipeline, material: Material) {
    let uniformBindGroup = compiled.get(material.uuid)?.uniformBindGroup as GPUBindGroup

    if (compiled.has(material.uuid)) {
      const { uniforms, uniformData, uniformBuffer } = compiled.get(material.uuid)!

      // Update uniforms
      let modified = 0
      let offset = 0
      Object.values(material.uniforms).forEach((uniform, i) => {
        const needsUpdate = !compareUniforms(uniforms[i], uniform)

        if (typeof uniform === 'number') {
          if (needsUpdate) uniformData[offset] = uniform
          offset += 1
        } else {
          if (needsUpdate) uniformData.set(uniform, offset)
          offset += uniform.length
        }

        if (needsUpdate) modified += 1
      })
      if (modified) this.writeBuffer(uniformBuffer, uniformData)
    } else {
      // @ts-expect-error
      const uniforms = Object.values(material.uniforms).map((uniform) => uniform?.clone() ?? uniform)
      const length = uniforms.reduce((n, u) => n + (u.length ?? 1), 0) as number
      const uniformData = new Float32Array(length)

      let location = 0
      uniforms.forEach((uniform) => {
        if (typeof uniform === 'number') {
          uniformData[location] = uniform
          location += 1
        } else {
          uniformData.set(uniform, location)
          location += uniform.length
        }
      })

      const uniformBuffer = this.createBuffer(uniformData, GPUBufferUsage.UNIFORM)
      this.writeBuffer(uniformBuffer, uniformData)

      uniformBindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: {
              buffer: uniformBuffer,
            },
          },
        ],
      })

      compiled.set(material.uuid, {
        uniforms,
        uniformData,
        uniformBuffer,
        uniformBindGroup,
        dispose: () => {},
      } as WebGPUMaterial)
    }

    return uniformBindGroup
  }

  compile(mesh: Mesh, camera?: Camera) {
    // Update built-ins
    mesh.material.uniforms.modelMatrix = mesh.worldMatrix

    if (camera) {
      mesh.material.uniforms.projectionMatrix = camera.projectionMatrix
      mesh.material.uniforms.viewMatrix = camera.viewMatrix
      mesh.material.uniforms.normalMatrix = mesh.normalMatrix

      mesh.modelViewMatrix.copy(camera.viewMatrix).multiply(mesh.worldMatrix)
      mesh.normalMatrix.getNormalMatrix(mesh.modelViewMatrix)
    }

    const attributes = this.updateGeometry(mesh.geometry)
    const pipeline = this.updatePipeline(attributes, mesh)
    const uniformBindGroup = this.updateUniforms(pipeline, mesh.material)

    return { attributes, pipeline, uniformBindGroup }
  }

  render(scene: Scene, camera: Camera) {
    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass({
      // @ts-expect-error WGPU types didn't remove deprecated keys
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: this.clearColor.r, g: this.clearColor.g, b: this.clearColor.b, a: this.clearAlpha },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      // @ts-expect-error WGPU types didn't remove deprecated keys
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
    scene.updateMatrix()

    // Update camera matrices
    if (camera) {
      camera.updateMatrix()
      camera.updateProjectionMatrix()
    }

    // Render children
    this.sort(scene, camera).forEach((mesh) => {
      // Compile on first render, otherwise update
      const compiled = this.compile(mesh, camera)

      // Bind
      passEncoder.setPipeline(compiled.pipeline)
      passEncoder.setBindGroup(0, compiled.uniformBindGroup)
      compiled.attributes.forEach((attribute, name) => {
        if (name === 'index') {
          passEncoder.setIndexBuffer(attribute.buffer, 'uint32')
        } else {
          passEncoder.setVertexBuffer(attribute.slot!, attribute.buffer)
        }
      })

      // Alternate drawing for indexed and non-indexed meshes
      const { index, position } = mesh.geometry.attributes
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
