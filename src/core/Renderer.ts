import { Color } from '../math/Color'
import type { Scene } from '../core/Scene'
import type { Camera } from '../core/Camera'

export abstract class Renderer {
  public canvas!: HTMLCanvasElement
  public clearColor = new Color(1, 1, 1)
  public clearAlpha = 0

  private _pixelRatio = 1
  private _viewport!: { x: number; y: number; width: number; height: number }
  private _scissor!: { x: number; y: number; width: number; height: number }

  setSize(width: number, height: number) {
    this.canvas.width = Math.floor(width * this._pixelRatio)
    this.canvas.height = Math.floor(height * this._pixelRatio)

    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    this.setViewport(0, 0, width, height)
    this.setScissor(0, 0, width, height)
  }

  get pixelRatio() {
    return this._pixelRatio
  }

  setPixelRatio(pixelRatio: number | number[]) {
    if (Array.isArray(pixelRatio)) {
      const [min, max] = pixelRatio
      this._pixelRatio = Math.min(Math.max(min, window.devicePixelRatio), max)
    } else {
      this._pixelRatio = pixelRatio
    }

    this.setSize(this._viewport.width, this._viewport.height)
  }

  get viewport() {
    return this._viewport
  }

  setViewport(x: number, y: number, width: number, height: number) {
    this._viewport = { x, y, width, height }
  }

  get scissor() {
    return this._scissor
  }

  setScissor(x: number, y: number, width: number, height: number) {
    this._scissor = { x, y, width, height }
  }

  abstract render(scene: Scene, camera?: Camera): void

  abstract dispose(): void
}
