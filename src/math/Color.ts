/**
 * Calculates a color and its rgb components.
 */
export class Color extends Array {
  constructor(r = 0xffffff, g?: number, b?: number) {
    super(3)
    this.set(r, g, b)
  }

  get r(): number {
    return this[0]
  }

  set r(r) {
    this[0] = r
  }

  get g(): number {
    return this[1]
  }

  set g(g) {
    this[1] = g
  }

  get b(): number {
    return this[2]
  }

  set b(b) {
    this[2] = b
  }

  /**
   * Sets this color's properties from a hexadecimal or individual components.
   */
  set(r: number, g?: number, b?: number): this {
    // Convert from hexadecimal
    if (g === undefined || b === undefined) {
      const hexadecimal = r
      r = ((hexadecimal >> 16) & 255) / 255
      g = ((hexadecimal >> 8) & 255) / 255
      b = (hexadecimal & 255) / 255
    }

    this.r = r
    this.g = g
    this.b = b

    return this
  }

  /**
   * Copies properties from another `Color`.
   */
  copy(c: Color): this {
    this.r = c.r
    this.g = c.g
    this.b = c.b

    return this
  }

  /**
   * Constructs a new `Color` with identical properties.
   */
  clone(): Color {
    return new Color().copy(this)
  }

  /**
   * Checks for strict equality with another `Color`.
   */
  equals(c: Color): boolean {
    // prettier-ignore
    return (
      this.r === c.r &&
      this.g === c.g &&
      this.b === c.b
    )
  }
}
