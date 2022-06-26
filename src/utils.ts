import type { Uniform } from './core/Material'

/**
 * Generates a v4 UUID. Useful for tracking unique objects.
 */
export const uuid = () =>
  '00-0-4-1-000'.replace(/\d/g, (s) =>
    (((Math.random() + Number(s)) * 0x10000) >> Number(s)).toString(16).padStart(4, '0').toUpperCase(),
  )

/**
 * Compares two uniforms by keys or reference.
 */
export const uniformsEqual = (a: Uniform, b: Uniform): boolean => {
  // Recursively compare array uniforms
  if (a instanceof Array && b instanceof Array) return a.every((v, i) => uniformsEqual(v, b[i]))
  // Atomically compare literals
  return a === b
}

/**
 * Clones a uniform's value into memory.
 */
export const cloneUniform = (uniform: Uniform, prev?: Uniform) => {
  // @ts-ignore
  return (prev ? prev.copy?.(uniform) : uniform.clone?.()) ?? uniform
}
