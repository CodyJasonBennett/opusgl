import { beforeEach, describe, it, expect } from 'vitest'
import { Program, Geometry, Material, Mesh, PerspectiveCamera, WebGPURenderer } from '../../src'

let program!: Program
let mesh!: Mesh
let camera!: PerspectiveCamera

beforeEach(() => {
  program = new Program({
    attributes: {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    },
    vertex: '',
    fragment: '',
  })

  const geometry = new Geometry({
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  })
  const material = new Material({ vertex: '', fragment: '' })
  mesh = new Mesh(geometry, material)
  camera = new PerspectiveCamera()
})

describe('renderers/WebGPURenderer', () => {
  it('can handle a Program', () => {
    expect(async () => {
      const renderer = await new WebGPURenderer().init()
      renderer.render(program)
      program.dispose()
    }).not.toThrow()
  })

  it('can handle a Mesh', () => {
    expect(async () => {
      const renderer = await new WebGPURenderer().init()
      renderer.render(mesh, camera)
      mesh.dispose()
    }).not.toThrow()
  })
})
