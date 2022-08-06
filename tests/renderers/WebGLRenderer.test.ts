import { beforeEach, describe, it, vi, expect } from 'vitest'
import { Geometry, Material, Mesh, PerspectiveCamera, WebGLRenderer } from '../../src'

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

describe('renderers/WebGLRenderer', () => {
  it('can render a Mesh', () => {
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
    renderer.compile(mesh)
    expect(bind).not.toHaveBeenCalledTimes(1)
    expect(bind).toHaveBeenLastCalledWith(null)

    // Cleans up after render
    renderer.render(mesh)
    expect(bind).not.toHaveBeenCalledTimes(2)
    expect(bind).toHaveBeenLastCalledWith(null)

    // Cleans up on dispose
    mesh.geometry.dispose()
    expect(dispose).toHaveBeenCalledOnce()
    expect(dispose).not.toHaveBeenCalledWith(null)
  })
})
