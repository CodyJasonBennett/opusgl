import { describe, it, expect } from 'vitest'
import { Color } from '../../src'

describe('math/Color', () => {
  it('can accept a hexadecimal', () => {
    const color = new Color(0x000000)

    expect(color.r).toBe(0)
    expect(color.g).toBe(0)
    expect(color.b).toBe(0)
  })

  it('can accept RGB', () => {
    const color = new Color(0, 0, 0)

    expect(color.r).toBe(0)
    expect(color.g).toBe(0)
    expect(color.b).toBe(0)
  })

  it('can copy a color', () => {
    const color = new Color()
    color.copy(new Color(0x000000))

    expect(color.r).toBe(0)
    expect(color.g).toBe(0)
    expect(color.b).toBe(0)
  })

  it('can clone itself', () => {
    const color1 = new Color(0x000000)
    const color2 = color1.clone()

    expect(color2).toBeInstanceOf(Color)
    expect(color2).not.toBe(color1)
    expect(color2.r).toBe(0)
    expect(color2.g).toBe(0)
    expect(color2.b).toBe(0)
  })

  it('can check for equality', () => {
    const color = new Color(0x000000)

    expect(color.equals(color.clone())).toBe(true)
    expect(color.equals(new Color())).toBe(false)
  })
})
