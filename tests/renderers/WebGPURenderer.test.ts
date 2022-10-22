import { beforeEach, describe, it, expect } from 'vitest'
import { Geometry, Material, Mesh, PerspectiveCamera, WebGPURenderer, WebGPURenderPipeline } from '../../src'

let mesh!: Mesh
let camera!: PerspectiveCamera

beforeEach(() => {
  const geometry = new Geometry({
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  })
  const material = new Material({ vertex: '', fragment: '' })
  mesh = new Mesh(geometry, material)
  camera = new PerspectiveCamera()
})

describe('renderers/WebGPURenderer', () => {
  it('can render a Mesh', () => {
    expect(async () => {
      const renderer = new WebGPURenderer()
      await renderer.render(mesh, camera)
      mesh.geometry.dispose()
      mesh.material.dispose()
    }).not.toThrow()
  })
})

describe('renderers/WebGPURenderer/WebGPURenderPipeline', () => {
  it('can parse bind group info from shader source', () => {
    // @ts-ignore
    const renderPipeline = new WebGPURenderPipeline()
    const bindGroupInfo = renderPipeline.getBindGroupInfo(
      `
        /*
          @binding(0) @group(0) var<uniform> uniforms: Foo;
        */
        struct Uniforms {
          // bool test,
          time: f32,
          color: vec3<f32>
        };
        @binding(0) @group(0) var<uniform> uniforms: Uniforms;
        @binding(1) @group(0) var sample: sampler;
        @binding(2) @group(0) var texture: texture_2d<f32>;
      `,
    )
    expect(bindGroupInfo).toMatchSnapshot()
  })
})
