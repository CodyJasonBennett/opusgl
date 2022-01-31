import { OrthographicCamera } from '../../src'

describe('cameras/OrthgraphicCamera', () => {
  it('can calculate an orthogonal projection matrix', () => {
    const camera = new OrthographicCamera()
    camera.updateProjectionMatrix()
    expect(Array.from(camera.projectionMatrix)).toMatchSnapshot()
  })
})
