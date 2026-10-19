import { cellXY, E, N, S, W, type Maze } from '../core/maze'

// Sequential blue ramp (steps 150..650) for visit counts; each step applies from `min` visits upward.
export const HEAT_STEPS = [
  { min: 1, color: '#b7d3f6' },
  { min: 2, color: '#86b6ef' },
  { min: 3, color: '#5598e7' },
  { min: 5, color: '#2a78d6' },
  { min: 8, color: '#1c5cab' },
  { min: 13, color: '#104281' },
]

const SURFACE = '#fcfcfb'
const WALL = '#2b2a27'
const INK = '#0b0b0b'
const TARGET_PX = 640

export interface Painter {
  draw(tick: number, heatmap: boolean): void
}

const heatColor = (count: number) => HEAT_STEPS.findLast((s) => count >= s.min)?.color ?? SURFACE

// Revisits darken the trail so loops are visible even without the heatmap.
const trailAlpha = (count: number) => (count >= 3 ? 0.6 : count === 2 ? 0.4 : 0.22)

function layer(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas.getContext('2d')!
}

/**
 * Incremental renderer: visited cells are painted once onto an offscreen layer as the tick advances,
 * so each frame only composites the layers plus the moving head.
 */
export function createPainter(canvas: HTMLCanvasElement, maze: Maze, trace: number[], route: number[], color: string): Painter {
  const cell = Math.max(4, Math.floor(TARGET_PX / Math.max(maze.width, maze.height)))
  const width = maze.width * cell
  const height = maze.height * cell
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const walls = drawWalls(maze, cell, width, height)
  const visits = layer(width, height)
  const counts = new Uint32Array(maze.width * maze.height)
  let drawnTick = -1
  let drawnHeatmap = false

  const center = (c: number): [number, number] => {
    const [x, y] = cellXY(maze.width, c)
    return [(x + 0.5) * cell, (y + 0.5) * cell]
  }

  const paintCell = (c: number, heatmap: boolean) => {
    const [x, y] = cellXY(maze.width, c)
    visits.clearRect(x * cell, y * cell, cell, cell)
    visits.globalAlpha = heatmap ? 1 : trailAlpha(counts[c])
    visits.fillStyle = heatmap ? heatColor(counts[c]) : color
    visits.fillRect(x * cell, y * cell, cell, cell)
  }

  return {
    draw(tick, heatmap) {
      const target = Math.min(tick, trace.length - 1)
      if (target < drawnTick || heatmap !== drawnHeatmap) {
        visits.clearRect(0, 0, width, height)
        counts.fill(0)
        drawnTick = -1
        drawnHeatmap = heatmap
      }
      for (let t = drawnTick + 1; t <= target; t++) {
        counts[trace[t]]++
        paintCell(trace[t], heatmap)
      }
      drawnTick = target

      ctx.fillStyle = SURFACE
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(visits.canvas, 0, 0)
      ctx.drawImage(walls.canvas, 0, 0)

      const finished = target >= trace.length - 1
      if (finished && route.length > 1) {
        ctx.strokeStyle = heatmap ? INK : color
        ctx.lineWidth = Math.max(2, cell / 3)
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()
        route.forEach((c, i) => (i === 0 ? ctx.moveTo(...center(c)) : ctx.lineTo(...center(c))))
        ctx.stroke()
      }
      drawMarkers(ctx, center, maze, cell)
      if (!finished && target >= 0) {
        const [hx, hy] = center(trace[target])
        ctx.beginPath()
        ctx.arc(hx, hy, Math.max(3, cell * 0.38), 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = SURFACE
        ctx.stroke()
      }
    },
  }
}

function drawWalls(maze: Maze, cell: number, width: number, height: number): CanvasRenderingContext2D {
  const ctx = layer(width, height)
  const segment = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  ctx.strokeStyle = WALL
  ctx.lineWidth = Math.max(1, Math.round(cell / 7))
  ctx.lineCap = 'square'
  ctx.beginPath()
  for (let c = 0; c < maze.walls.length; c++) {
    const [x, y] = cellXY(maze.width, c)
    const px = x * cell
    const py = y * cell
    const w = maze.walls[c]
    if (w & N) segment(px, py, px + cell, py)
    if (w & W) segment(px, py, px, py + cell)
    if (y === maze.height - 1 && w & S) segment(px, py + cell, px + cell, py + cell)
    if (x === maze.width - 1 && w & E) segment(px + cell, py, px + cell, py + cell)
  }
  ctx.stroke()
  return ctx
}

function drawMarkers(ctx: CanvasRenderingContext2D, center: (c: number) => [number, number], maze: Maze, cell: number) {
  const r = Math.max(3, cell * 0.32)
  const [sx, sy] = center(maze.start)
  ctx.beginPath()
  ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.lineWidth = Math.max(1.5, cell / 8)
  ctx.strokeStyle = INK
  ctx.stroke()
  const [ex, ey] = center(maze.exit)
  ctx.fillStyle = INK
  ctx.fillRect(ex - r, ey - r, r * 2, r * 2)
}
