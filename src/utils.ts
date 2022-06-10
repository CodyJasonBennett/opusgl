import type { Uniform } from './core/Material'

/**
 * Generates a v4 UUID. Useful for tracking unique objects.
 */
export const uuid = () =>
  '00-0-4-1-000'.replace(/\d/g, (s) =>
    (((Math.random() + Number(s)) * 0x10000) >> Number(s)).toString(16).padStart(4, '0').toUpperCase(),
  )

/**
 * Compares two uniforms, preferring to use math `equals` methods if available.
 */
export const uniformsEqual = (a: Uniform, b: Uniform) => {
  // @ts-ignore Compare math classes
  if (a.constructor === b.constructor && typeof b.equals === 'function') return b.equals(a) as boolean
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
