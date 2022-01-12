import { COLORS } from '../constants'

export type ColorRepresentation = keyof typeof COLORS | number

/**
 * Converts a CSS string name or hexadecimal to RGB (0-1)
 */
export const toRGB = (c: ColorRepresentation) => {
  // Convert string to hexadecimal
  if (typeof c === 'string') c = COLORS[c] ?? 0xffffff

  // Convert hexadecimal to RGB
  const r = (((c as number) >> 16) & 255) / 255
  const g = (((c as number) >> 8) & 255) / 255
  const b = (c as number & 255) / 255

  return { r, g, b }
}

export class Color extends Float32Array {
  readonly isColor = true

  constructor(r: ColorRepresentation = 0xffffff, g?: number, b?: number) {
    super(3)
    this.set(r, g, b)
  }

  get r() {
    return this[0]
  }

  get g() {
    return this[1]
  }

  get b() {
    return this[2]
  }

  set r(r) {
    this[0] = r
  }

  set g(g) {
    this[1] = g
  }

  set b(b) {
    this[2] = b
  }

  // @ts-expect-error
  set(r: ColorRepresentation, g?: number, b?: number) {
    if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
      this.r = r
      this.g = g
      this.b = b
    } else {
      // Convert string or hexadecimal to RGB
      const color = toRGB(r)
      this.r = color.r
      this.g = color.g
      this.b = color.b
    }

    return this
  }

  copy(c: Color) {
    this.r = c.r
    this.g = c.g
    this.b = c.b

    return this
  }

  clone() {
    return new Color().copy(this)
  }

  equals(c: Color) {
    // prettier-ignore
    return (
      this.r === c.r &&
      this.g === c.g &&
      this.b === c.b
    )
  }
}
