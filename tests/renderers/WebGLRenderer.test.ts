import { beforeEach, describe, it, vi, expect } from 'vitest'
import { Program, Geometry, Material, Mesh, PerspectiveCamera, WebGLRenderer } from '../../src'

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

describe('renderers/WebGLRenderer', () => {
  it('can handle a Program', () => {
    expect(() => {
      const renderer = new WebGLRenderer()
      renderer.render(program)
    }).not.toThrow()
  })

  it('can handle a Mesh', () => {
    expect(() => {
      const renderer = new WebGLRenderer()
      renderer.render(mesh, camera)
    }).not.toThrow()
  })

  it('cleans up VAO state', () => {
    const renderer = new WebGLRenderer()
    const bind = vi.spyOn(renderer.gl, 'bindVertexArray')
    const dispose = vi.spyOn(renderer.gl, 'deleteVertexArray')

    // Cleans up after compile
    renderer.compile(program)
    expect(bind).not.toHaveBeenCalledTimes(1)
    expect(bind).toHaveBeenLastCalledWith(null)

    // Cleans up after render
    renderer.render(program)
    expect(bind).not.toHaveBeenCalledTimes(2)
    expect(bind).toHaveBeenLastCalledWith(null)

    // Cleans up on dispose
    program.dispose()
    expect(dispose).toHaveBeenCalledOnce()
    expect(dispose).not.toHaveBeenCalledWith(null)
  })
})
