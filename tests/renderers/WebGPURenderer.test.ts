import { beforeEach, describe, it, expect } from 'vitest'
import { Geometry, Material, Mesh, PerspectiveCamera, WebGPURenderer } from '../../src'

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
      const renderer = await new WebGPURenderer().init()
      renderer.render(mesh, camera)
      mesh.dispose()
    }).not.toThrow()
  })
})
