import type { Uniform } from './core/Material'

/**
 * Generates a random UUID. Useful for tracking unique objects.
 */
export const uuid = () =>
  '00-0-4-1-000'.replace(/\d/g, (s) =>
    (((Math.random() + Number(s)) * 0x10000) >> Number(s)).toString(16).padStart(4, '0'),
  )

export type Disposable = { [key: string]: any; dispose: () => void }

/**
 * Compiled objects by UUID. Can be disposed of via `Disposable.dispose()`.
 */
export const compiled = new Map<string, Disposable>()

/**
 * Disposes of an object by uuid.
 */
export const dispose = (uuid: string) => {
  if (!compiled.has(uuid)) return

  compiled.get(uuid)!.dispose?.()
  compiled.delete(uuid)
}

/**
 * Compares two uniforms, preferring to use math `equals` methods if available.
 */
export const compareUniforms = (a: Uniform, b: Uniform) => {
  // @ts-expect-error
  if (a?.constructor === b?.constructor && typeof b?.equals === 'function') return b.equals(a) as boolean
  return a === b
}
