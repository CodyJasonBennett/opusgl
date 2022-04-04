import type { Uniform } from './core/Program'

/**
 * Generates a v4 UUID. Useful for tracking unique objects.
 */
export const uuid = () =>
  '00-0-4-1-000'.replace(/\d/g, (s) =>
    (((Math.random() + Number(s)) * 0x10000) >> Number(s)).toString(16).padStart(4, '0').toUpperCase(),
  )

// Pad to 16 byte chunks of 2, 4 (std140 layout)
const pad2 = (n: number) => n + (n % 2)
const pad4 = (n: number) => n + ((4 - (n % 4)) % 4)

/**
 * Packs uniforms into a std140 compliant array buffer.
 */
export const std140 = (uniforms: Uniform[], buffer?: Float32Array) => {
  // Init buffer
  if (!buffer) {
    const length = pad4(
      uniforms.reduce(
        (n: number, u: Uniform) => n + (typeof u === 'number' ? 1 : u.length <= 2 ? pad2(u.length) : pad4(u.length)),
        0,
      ),
    )
    buffer = new Float32Array(length)
  }

  // Pack buffer
  let offset = 0
  for (const uniform of uniforms) {
    if (typeof uniform === 'number') {
      buffer[offset] = uniform
      offset += 1 // leave empty space to stack primitives
    } else {
      const pad = uniform.length <= 2 ? pad2 : pad4
      offset = pad(offset) // fill in empty space
      buffer.set(uniform, offset)
      offset += pad(uniform.length)
    }
  }

  return buffer
}
