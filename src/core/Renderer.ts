import { Color } from '../math/Color'
import type { Program, Uniform } from './Program'
import type { Geometry } from './Geometry'
import type { Material } from './Material'
import type { Mesh } from './Mesh'
import type { Object3D } from './Object3D'
import type { Camera } from './Camera'

export interface Disposable {
  dispose: () => void
}

export type Compilable = Program | Geometry | Material | Mesh

export class Compiled<Compiled extends Disposable> extends Map<Compilable, Compiled> {
  // @ts-expect-error
  set(object: Compilable, compiled: Compiled) {
    super.set(object, compiled)

    const dispose = object.dispose.bind(object)
    object.dispose = () => {
      dispose()

      compiled.dispose?.()
      object.dispose = dispose
    }
  }
}

export type Viewport = { x: number; y: number; width: number; height: number }
export type Scissor = { x: number; y: number; width: number; height: number }

/**
 * Constructs a renderer object. Can be extended to draw to a canvas.
 */
export abstract class Renderer {
  /**
   * Output canvas to draw to.
   */
  public canvas!: HTMLCanvasElement
  /**
   * Output background color. Default is `white`.
   */
  public clearColor = new Color(1, 1, 1)
  /**
   * Output background opacity. Default is `0`.
   */
  public clearAlpha = 0

  private _pixelRatio = 1
  private _viewport!: Viewport
  private _scissor!: Scissor

  /**
   * Sets the canvas size. Will reset viewport and scissor state.
   */
  setSize(width: number, height: number) {
    this.canvas.width = Math.floor(width * this._pixelRatio)
    this.canvas.height = Math.floor(height * this._pixelRatio)

    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    this.setViewport(0, 0, width, height)
    this.setScissor(0, 0, width, height)
  }

  /**
   * Gets the current pixel ratio.
   */
  get pixelRatio() {
    return this._pixelRatio
  }

  /**
   * Interpolates a pixel ratio and resizes accordingly.
   */
  setPixelRatio(pixelRatio: number | number[]) {
    if (Array.isArray(pixelRatio)) {
      const [min, max] = pixelRatio
      this._pixelRatio = Math.min(Math.max(min, window.devicePixelRatio), max)
    } else {
      this._pixelRatio = pixelRatio
    }

    this.setSize(this._viewport.width, this._viewport.height)
  }

  /**
   * Gets the current viewport state.
   */
  get viewport() {
    return this._viewport
  }

  /**
   * Sets the global drawing region. Useful for manipulating the drawing area outside of the DOM.
   */
  setViewport(x: number, y: number, width: number, height: number) {
    this._viewport = { x, y, width, height }
  }

  /**
   * Gets the current scissor state.
   */
  get scissor() {
    return this._scissor
  }

  /**
   * Sets the current scissor region. Useful for rendering in a certain region.
   */
  setScissor(x: number, y: number, width: number, height: number) {
    this._scissor = { x, y, width, height }
  }

  /**
   * Returns a list of visible meshes. Will frustum cull and depth-sort with a camera if available.
   */
  sort(scene: Object3D, camera?: Camera) {
    const meshes: Mesh[] = []

    scene.traverse((node) => {
      if (!node.visible) return true

      const mesh = node as Mesh
      if (!mesh.isMesh) return

      meshes.push(mesh)
    })

    // TODO: handle frustum culling and depth sorting

    return meshes
  }

  /**
   * Compares two uniforms, preferring to use math `equals` methods if available.
   */
  uniformsEqual(a: Uniform, b: Uniform) {
    // @ts-expect-error
    if (a?.constructor === b?.constructor && typeof b?.equals === 'function') return b.equals(a) as boolean
    return a === b
  }

  /**
   * Renders a scene of objects with an optional camera.
   */
  abstract render(scene: Object3D | Program, camera?: Camera): void
}
