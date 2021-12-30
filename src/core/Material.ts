let id = 0

export interface MaterialOptions {
  vertex: string
  fragment: string
  uniforms?: { [name: string]: any }
}

export class Material {
  readonly isMaterial = true
  readonly id: number
  readonly vertex: string
  readonly fragment: string
  readonly uniforms: { [name: string]: any } = {}

  constructor(options?: MaterialOptions) {
    this.id = id++

    if (options) {
      this.vertex = options.vertex
      this.fragment = options.fragment
      this.uniforms = options.uniforms ?? {}
    }
  }
}
