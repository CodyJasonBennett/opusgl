import { describe, it, expect } from 'vitest'
import { Camera } from '../../src'

class CameraImpl extends Camera {
  updateProjectionMatrix(): void {}
}

describe('core/Renderer', () => {
  it('can create a view matrix', () => {
    const camera = new CameraImpl()
    camera.position.set(1, 2, 3)
    camera.rotation.set(0.4)
    camera.updateMatrix()

    expect(Array.from(camera.viewMatrix)).toMatchSnapshot()
  })
})
