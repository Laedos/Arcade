import { describe, expect, it } from 'vitest'
import { CANVAS_SIZE, type Stroke } from './protocol'
import { countPoints, extendStroke, type Painter, paintStrokes, toCanvasPoint } from './strokes'

function recorder() {
  const calls: string[] = []
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    beginPath: () => calls.push('begin'),
    moveTo: (x: number, y: number) => calls.push(`move ${x},${y}`),
    lineTo: (x: number, y: number) => calls.push(`line ${x},${y}`),
    arc: (x: number, y: number, r: number) => calls.push(`arc ${x},${y} r${r}`),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    clearRect: () => calls.push('clear'),
    fillRect: (x: number, y: number, w: number, h: number) => calls.push(`rect ${x},${y},${w},${h}`),
  }
  return { ctx: ctx as unknown as Painter, calls }
}

const line = (points: number[], color = '#1b1b1f', size = 10): Stroke => ({ color, size, points })

describe('toCanvasPoint', () => {
  const rect = { left: 100, top: 50, width: 500, height: 500 }

  it('maps screen pixels onto the shared canvas grid', () => {
    expect(toCanvasPoint(100, 50, rect)).toEqual([0, 0])
    expect(toCanvasPoint(350, 300, rect)).toEqual([CANVAS_SIZE / 2, CANVAS_SIZE / 2])
  })

  it('clamps points dragged off the edge', () => {
    expect(toCanvasPoint(0, 900, rect)).toEqual([0, CANVAS_SIZE])
  })
})

describe('extendStroke', () => {
  it('adds the first point and any point far enough from the last', () => {
    const stroke = line([])
    expect(extendStroke(stroke, 10, 10)).toBe(true)
    expect(extendStroke(stroke, 11, 11)).toBe(false)
    expect(extendStroke(stroke, 20, 10)).toBe(true)
    expect(stroke.points).toEqual([10, 10, 20, 10])
  })
})

describe('countPoints', () => {
  it('counts x,y pairs across strokes', () => {
    expect(countPoints([line([1, 1, 2, 2]), line([3, 3])])).toBe(3)
    expect(countPoints([])).toBe(0)
  })
})

describe('paintStrokes', () => {
  it('clears to white and scales strokes to the target size', () => {
    const { ctx, calls } = recorder()
    paintStrokes(ctx, [line([0, 0, 500, 1000])], 200)
    expect(calls).toEqual(['rect 0,0,200,200', 'begin', 'move 0,0', 'line 100,200', 'stroke'])
    expect(ctx.lineWidth).toBe(2)
    expect(ctx.lineCap).toBe('round')
  })

  it('draws a single tap as a dot', () => {
    const { ctx, calls } = recorder()
    paintStrokes(ctx, [line([500, 500], '#e5484d', 48)], 100)
    expect(calls).toEqual(['rect 0,0,100,100', 'begin', 'arc 50,50 r2.4000000000000004', 'fill'])
    expect(ctx.fillStyle).toBe('#e5484d')
  })

  it('stops after the point limit, part way through a stroke', () => {
    const { ctx, calls } = recorder()
    paintStrokes(ctx, [line([0, 0, 10, 0, 20, 0]), line([0, 10, 10, 10])], 1000, 2)
    expect(calls).toEqual(['rect 0,0,1000,1000', 'begin', 'move 0,0', 'line 10,0', 'stroke'])
  })
})
