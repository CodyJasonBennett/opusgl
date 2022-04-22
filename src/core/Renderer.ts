import { Color } from '../math/Color'
import type { Program } from './Program'
import type { Geometry } from './Geometry'
import type { Material } from './Material'
import type { Mesh } from './Mesh'
import type { Texture } from './Texture'
import type { RenderTarget } from './RenderTarget'
import type { Object3D } from './Object3D'
import type { Camera } from './Camera'

export interface Disposable {
  dispose: () => void
}

export type Compilable = Program | Geometry | Material | Mesh | Texture | RenderTarget

export class Compiled<Compiled extends Disposable> extends Map<Compilable, Compiled> {
  // @ts-expect-error
  set(object: Compilable, compiled: Compiled) {
    super.set(object, compiled)

    const dispose = object.dispose.bind(object)
    object.dispose = () => {
      dispose()

      compiled.dispose?.()
      object.dispose = dispose
      this.delete(object)
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
   * Output background color. Default is `0, 0, 0`.
   */
  public clearColor = new Color(0, 0, 0)
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
  setPixelRatio(pixelRatio: number) {
    this._pixelRatio = pixelRatio
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
      // Skip invisible nodes
      if (!node.visible) return true

      // Filter to meshes
      const mesh = node as Mesh
      if (!mesh.isMesh) return

      // Frustum cull if able
      if (camera && mesh.frustumCulled) {
        const inFrustum = camera.frustumContains(mesh)
        if (!inFrustum) return true
      }

      meshes.push(mesh)
    })

    // TODO: handle depth sorting

    return meshes
  }

  /**
   * Compiles a mesh or program and sets initial uniforms.
   */
  abstract compile(target: Mesh | Program, camera?: Camera): void

  /**
   * Renders a scene of objects with an optional camera.
   */
  abstract render(scene: Object3D | Program, camera?: Camera): void
}
