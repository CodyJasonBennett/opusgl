import { describe, it, expect } from 'vitest'
import { Renderer, Scene, Mesh, Geometry, Material } from '../../src'

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
})
