import type { Uniform } from './core/Material'

/**
 * Adds line numbers to a string with an optional starting offset.
 */
export const lineNumbers = (source: string, offset = 0): string => source.replace(/^/gm, () => `${offset++}:`)

/**
 * Compares two uniforms by keys or reference.
 */
export function uniformsEqual(a: Uniform, b: Uniform): boolean {
  // Recursively compare array uniforms
  if (a instanceof Array && b instanceof Array) return a.every((v, i) => uniformsEqual(v, b[i]))
  // Atomically compare literals
  return a === b
}

/**
 * Clones a uniform's value into memory.
 */
export function cloneUniform(uniform: Uniform, prev?: Uniform): Uniform {
  // @ts-ignore
  return (prev ? prev.copy?.(uniform) : uniform.clone?.()) ?? uniform
}
