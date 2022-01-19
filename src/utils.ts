/**
 * Generates a random UUID. Useful for tracking unique objects.
 */
export const uuid = () =>
  '00-0-4-1-000'.replace(/[^-]/g, (s) =>
    (((Math.random() + ~~Number(s)) * 0x10000) >> Number(s)).toString(16).padStart(4, '0'),
  )