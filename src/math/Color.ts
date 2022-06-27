import { COLORS } from '../constants'

/**
 * Represents a CSS name, hexadecimal, or normalized color type.
 */
export type ColorRepresentation = keyof typeof COLORS | number

/**
 * Calculates a color and its r, g, and b components.
 */
export class Color extends Array {
  constructor(r: ColorRepresentation = 0xffffff, g?: number, b?: number) {
    super(3)
    this.set(r, g, b)
  }

  get r() {
    return this[0]
  }

  set r(r) {
    this[0] = r
  }

  get g() {
    return this[1]
  }

  set g(g) {
    this[1] = g
  }

  get b() {
    return this[2]
  }

  set b(b) {
    this[2] = b
  }

  /**
   * Sets this color's r, g, b properties from a `ColorRepresentation` or individual components.
   */
  set(r: ColorRepresentation, g?: number, b?: number) {
    if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
      this.r = r
      this.g = g
      this.b = b
    } else if (typeof r === 'string') {
      this.fromString(r)
    } else {
      this.fromHex(r)
    }

    return this
  }

  /**
   * Copies properties from another `Color`.
   */
  copy(c: Color) {
    this.r = c.r
    this.g = c.g
    this.b = c.b

    return this
  }

  /**
   * Constructs a new `Color` with identical properties.
   */
  clone() {
    return new Color().copy(this)
  }

  /**
   * Checks for strict equality with another `Color`.
   */
  equals(c: Color) {
    // prettier-ignore
    return (
      this.r === c.r &&
      this.g === c.g &&
      this.b === c.b
    )
  }

  /**
   * Sets color from a CSS color name.
   */
  fromString(s: keyof typeof COLORS) {
    const hex = COLORS[s] ?? 0xffffff
    return this.fromHex(hex)
  }

  /**
   * Sets color from a hexadecimal.
   */
  fromHex(h: number) {
    const r = ((h >> 16) & 255) / 255
    const g = ((h >> 8) & 255) / 255
    const b = (h & 255) / 255

    return this.set(r, g, b)
  }
}
