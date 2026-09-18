import { CANVAS_SIZE, type Stroke } from './protocol'

// Points closer than this (in canvas units) add nothing visible and just bloat the drawing.
export const MIN_POINT_DISTANCE = 3

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export type Painter = Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'lineTo' | 'arc' | 'stroke' | 'fill' | 'clearRect' | 'fillRect'> & {
  strokeStyle: CanvasRenderingContext2D['strokeStyle']
  fillStyle: CanvasRenderingContext2D['fillStyle']
  lineWidth: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
}

export function toCanvasPoint(clientX: number, clientY: number, rect: Rect): [number, number] {
  const clamp = (v: number) => Math.min(CANVAS_SIZE, Math.max(0, Math.round(v)))
  return [clamp(((clientX - rect.left) / rect.width) * CANVAS_SIZE), clamp(((clientY - rect.top) / rect.height) * CANVAS_SIZE)]
}

export function extendStroke(stroke: Stroke, x: number, y: number): boolean {
  const n = stroke.points.length
  if (n >= 2 && Math.hypot(x - stroke.points[n - 2], y - stroke.points[n - 1]) < MIN_POINT_DISTANCE) return false
  stroke.points.push(x, y)
  return true
}

export function countPoints(strokes: readonly Stroke[]): number {
  return strokes.reduce((sum, s) => sum + s.points.length / 2, 0)
}

// Paints onto a square of `pixels` pixels. `limit` caps how many points are drawn in total,
// which is how the reveal replays a drawing stroke by stroke.
export function paintStrokes(ctx: Painter, strokes: readonly Stroke[], pixels: number, limit = Number.POSITIVE_INFINITY): void {
  const scale = pixels / CANVAS_SIZE
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, pixels, pixels)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  let remaining = limit
  for (const stroke of strokes) {
    if (remaining <= 0) return
    const pairs = Math.min(stroke.points.length / 2, remaining)
    remaining -= pairs
    const p = stroke.points
    if (pairs === 1) {
      ctx.fillStyle = stroke.color
      ctx.beginPath()
      ctx.arc(p[0] * scale, p[1] * scale, (stroke.size * scale) / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size * scale
    ctx.beginPath()
    ctx.moveTo(p[0] * scale, p[1] * scale)
    for (let i = 1; i < pairs; i++) ctx.lineTo(p[i * 2] * scale, p[i * 2 + 1] * scale)
    ctx.stroke()
  }
}
