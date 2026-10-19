// Square grid maze. Each cell stores a 4-bit wall mask; a set bit means the wall is present.
export const N = 1
export const E = 2
export const S = 4
export const W = 8

// Clockwise order so that (d + 1) % 4 is a right turn and (d + 3) % 4 a left turn.
export const DIRS = [
  { bit: N, dx: 0, dy: -1, opposite: S },
  { bit: E, dx: 1, dy: 0, opposite: W },
  { bit: S, dx: 0, dy: 1, opposite: N },
  { bit: W, dx: -1, dy: 0, opposite: E },
] as const

export interface Maze {
  readonly width: number
  readonly height: number
  readonly walls: Uint8Array
  readonly start: number
  readonly exit: number
  readonly seed: number
}

export const cellCount = (maze: Pick<Maze, 'width' | 'height'>) => maze.width * maze.height

export function cellXY(width: number, cell: number): [number, number] {
  return [cell % width, Math.floor(cell / width)]
}

/** Neighbour index in direction d, or -1 when it falls outside the grid. */
export function neighbor(width: number, height: number, cell: number, d: number): number {
  const x = (cell % width) + DIRS[d].dx
  const y = Math.floor(cell / width) + DIRS[d].dy
  return x < 0 || y < 0 || x >= width || y >= height ? -1 : y * width + x
}

export function isOpen(maze: Maze, cell: number, d: number): boolean {
  return (maze.walls[cell] & DIRS[d].bit) === 0 && neighbor(maze.width, maze.height, cell, d) !== -1
}

export function openNeighbors(maze: Maze, cell: number): number[] {
  const result: number[] = []
  for (let d = 0; d < 4; d++) {
    if (isOpen(maze, cell, d)) result.push(neighbor(maze.width, maze.height, cell, d))
  }
  return result
}

/** Direction from a to an adjacent cell b, or -1 if they are not adjacent. */
export function directionTo(width: number, a: number, b: number): number {
  const diff = b - a
  if (diff === -width) return 0
  if (diff === 1 && b % width !== 0) return 1
  if (diff === width) return 2
  if (diff === -1 && a % width !== 0) return 3
  return -1
}

export function manhattan(width: number, a: number, b: number): number {
  const [ax, ay] = cellXY(width, a)
  const [bx, by] = cellXY(width, b)
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

/** BFS distance from start to exit (number of moves), or -1 if unreachable. */
export function shortestDistance(maze: Maze): number {
  const dist = new Int32Array(cellCount(maze)).fill(-1)
  const queue = [maze.start]
  dist[maze.start] = 0
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head]
    if (c === maze.exit) return dist[c]
    for (const n of openNeighbors(maze, c)) {
      if (dist[n] === -1) {
        dist[n] = dist[c] + 1
        queue.push(n)
      }
    }
  }
  return -1
}

/** True when route is a contiguous walk through open passages from start to exit. */
export function isValidRoute(maze: Maze, route: readonly number[]): boolean {
  if (route.length === 0 || route[0] !== maze.start || route[route.length - 1] !== maze.exit) return false
  for (let i = 1; i < route.length; i++) {
    const d = directionTo(maze.width, route[i - 1], route[i])
    if (d === -1 || !isOpen(maze, route[i - 1], d)) return false
  }
  return true
}
