import { BRUSH_SIZES, PALETTE, type Stroke } from './protocol'
import { extendStroke, paintStrokes, toCanvasPoint } from './strokes'

// Canvas input wiring only: the stroke maths lives in strokes.ts, where it's tested.
export class DrawingPad {
  readonly strokes: Stroke[] = []
  color: string = PALETTE[0]
  size: number = BRUSH_SIZES[1]
  private current: Stroke | null = null
  private readonly ctx: CanvasRenderingContext2D
  private readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    canvas.addEventListener('pointerdown', (e) => this.begin(e))
    canvas.addEventListener('pointermove', (e) => this.move(e))
    canvas.addEventListener('pointerup', () => this.end())
    canvas.addEventListener('pointercancel', () => this.end())
    this.resize()
  }

  resize(): void {
    const pixels = Math.round(this.canvas.clientWidth * (window.devicePixelRatio || 1))
    this.canvas.width = pixels
    this.canvas.height = pixels
    this.repaint()
  }

  undo(): void {
    this.strokes.pop()
    this.repaint()
  }

  clear(): void {
    this.strokes.length = 0
    this.repaint()
  }

  private begin(event: PointerEvent): void {
    event.preventDefault()
    this.canvas.setPointerCapture(event.pointerId)
    this.current = { color: this.color, size: this.size, points: [] }
    this.strokes.push(this.current)
    this.addPoint(event)
  }

  private move(event: PointerEvent): void {
    if (!this.current) return
    for (const e of event.getCoalescedEvents?.() ?? [event]) this.addPoint(e)
  }

  private end(): void {
    this.current = null
  }

  private addPoint(event: PointerEvent): void {
    const [x, y] = toCanvasPoint(event.clientX, event.clientY, this.canvas.getBoundingClientRect())
    if (this.current && extendStroke(this.current, x, y)) this.repaint()
  }

  private repaint(): void {
    paintStrokes(this.ctx, this.strokes, this.canvas.width)
  }
}
