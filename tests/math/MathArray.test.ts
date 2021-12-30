import { MathArray } from '../../src'

describe('math/MathArray', () => {
  it('wraps a Float32Array with a defined length', () => {
    const arr = new MathArray(3)

    expect((arr as any)._instance instanceof Float32Array).toBe(true)
    expect((arr as any)._instance.length).toBe(3)
  })

  it('proxies indices to the wrapped Float32Array', () => {
    const arr = new MathArray(3)
    arr[0] = 0
    arr[1] = 1
    arr[2] = 2

    expect((arr as any)._instance[0]).toBe(0)
    expect((arr as any)._instance[1]).toBe(1)
    expect((arr as any)._instance[2]).toBe(2)
  })

  it('proxies named indices to the wrapped Float32Array', () => {
    const arr = new MathArray(4) as MathArray & { x: number; y: number; z: number; w: number }
    arr.x = 0
    arr.y = 1
    arr.z = 2
    arr.w = 3

    expect((arr as any)._instance[0]).toBe(0)
    expect((arr as any)._instance[1]).toBe(1)
    expect((arr as any)._instance[2]).toBe(2)
    expect((arr as any)._instance[3]).toBe(3)
  })

  it('supports arbitrarily named indices', () => {
    const arr = new MathArray(3, ['r', 'g', 'b']) as MathArray & { r: number; g: number; b: number }
    arr.r = 0
    arr.g = 1
    arr.b = 2

    expect((arr as any).r).toBe(0)
    expect((arr as any).g).toBe(1)
    expect((arr as any).b).toBe(2)

    // Should also opt-out
    expect((arr as any).x).toBeUndefined()
    expect((new MathArray(3, null) as any).x).toBeUndefined()
  })
})
