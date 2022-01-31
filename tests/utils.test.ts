import { compareUniforms, Vector2 } from '../src'

describe('utils#compareUniforms', () => {
  it('can compare initial uniforms', () => {
    expect(compareUniforms(undefined, 0)).toBe(false)
    expect(compareUniforms(undefined, undefined)).toBe(true)
  })

  it('can compare math classes via equals', () => {
    expect(compareUniforms(new Vector2(1), new Vector2(1))).toBe(true)
    expect(compareUniforms(new Vector2(1), new Vector2(2))).toBe(false)
  })

  it('can atomically compare numbers', () => {
    expect(compareUniforms(1, 1)).toBe(true)
    expect(compareUniforms(1, 2)).toBe(false)
  })
})
