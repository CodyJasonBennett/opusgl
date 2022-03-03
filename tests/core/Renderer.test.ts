import { describe, it, expect } from 'vitest'
import { Renderer, Scene, Mesh, Geometry, Material, Vector2 } from '../../src'

class RendererImpl extends Renderer {
  render() {}
}

describe('core/Renderer', () => {
  it('can sort a list of meshes by visibility', () => {
    const renderer = new RendererImpl()

    const scene = new Scene()
    scene.add(new Mesh(new Geometry(), new Material()))

    const renderList = renderer.sort(scene)

    expect(renderList.length).toBe(1)
  })

  it('can compare uniforms', () => {
    const renderer = new RendererImpl()

    // Compares initial uniforms
    expect(renderer.uniformsEqual(undefined, 0)).toBe(false)
    expect(renderer.uniformsEqual(undefined, undefined)).toBe(true)

    // Compares math classes via #equals
    expect(renderer.uniformsEqual(new Vector2(1), new Vector2(1))).toBe(true)
    expect(renderer.uniformsEqual(new Vector2(1), new Vector2(2))).toBe(false)

    // Atomically compares numbers
    expect(renderer.uniformsEqual(1, 1)).toBe(true)
    expect(renderer.uniformsEqual(1, 2)).toBe(false)
  })
})
