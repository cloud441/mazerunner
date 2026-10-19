import { DIRS, neighbor, type Maze } from './maze'
import { createRng, randomInt, shuffle, type Rng } from './rng'

export type GeneratorId = 'backtracker' | 'prim' | 'kruskal' | 'wilson' | 'aldousBroder'
export type Placement = 'corners' | 'center'

export const GENERATORS: readonly { id: GeneratorId; label: string }[] = [
  { id: 'backtracker', label: 'Recursive backtracker' },
  { id: 'prim', label: 'Prim' },
  { id: 'kruskal', label: 'Kruskal' },
  { id: 'wilson', label: 'Wilson' },
  { id: 'aldousBroder', label: 'Aldous-Broder' },
]

export interface MazeParams {
  generator: GeneratorId
  width: number
  height: number
  /** Fraction (0..1) of the remaining interior walls removed after generation to create loops. */
  loopFactor: number
  placement: Placement
  seed: number
}

interface Grid {
  width: number
  height: number
  walls: Uint8Array
}

function carve(grid: Grid, cell: number, d: number): number {
  const next = neighbor(grid.width, grid.height, cell, d)
  grid.walls[cell] &= ~DIRS[d].bit
  grid.walls[next] &= ~DIRS[d].opposite
  return next
}

/** Directions from cell that stay inside the grid. */
function inBoundDirs(grid: Grid, cell: number): number[] {
  return [0, 1, 2, 3].filter((d) => neighbor(grid.width, grid.height, cell, d) !== -1)
}

function backtracker(grid: Grid, rng: Rng): void {
  const visited = new Uint8Array(grid.walls.length)
  const stack = [randomInt(rng, grid.walls.length)]
  visited[stack[0]] = 1
  while (stack.length > 0) {
    const cell = stack[stack.length - 1]
    const options = inBoundDirs(grid, cell).filter((d) => !visited[neighbor(grid.width, grid.height, cell, d)])
    if (options.length === 0) {
      stack.pop()
      continue
    }
    const next = carve(grid, cell, options[randomInt(rng, options.length)])
    visited[next] = 1
    stack.push(next)
  }
}

function prim(grid: Grid, rng: Rng): void {
  const inMaze = new Uint8Array(grid.walls.length)
  const inFrontier = new Uint8Array(grid.walls.length)
  const frontier: number[] = []
  const add = (cell: number) => {
    inMaze[cell] = 1
    for (const d of inBoundDirs(grid, cell)) {
      const n = neighbor(grid.width, grid.height, cell, d)
      if (!inMaze[n] && !inFrontier[n]) {
        inFrontier[n] = 1
        frontier.push(n)
      }
    }
  }
  add(randomInt(rng, grid.walls.length))
  while (frontier.length > 0) {
    const i = randomInt(rng, frontier.length)
    const cell = frontier[i]
    frontier[i] = frontier[frontier.length - 1]
    frontier.pop()
    const links = inBoundDirs(grid, cell).filter((d) => inMaze[neighbor(grid.width, grid.height, cell, d)])
    carve(grid, cell, links[randomInt(rng, links.length)])
    add(cell)
  }
}

function kruskal(grid: Grid, rng: Rng): void {
  const parent = Int32Array.from({ length: grid.walls.length }, (_, i) => i)
  const find = (c: number): number => {
    while (parent[c] !== c) {
      parent[c] = parent[parent[c]]
      c = parent[c]
    }
    return c
  }
  // Only east and south edges, so every interior wall appears exactly once.
  const edges: [number, number][] = []
  for (let c = 0; c < grid.walls.length; c++) {
    for (const d of [1, 2]) if (neighbor(grid.width, grid.height, c, d) !== -1) edges.push([c, d])
  }
  for (const [cell, d] of shuffle(rng, edges)) {
    const a = find(cell)
    const b = find(neighbor(grid.width, grid.height, cell, d))
    if (a !== b) {
      parent[a] = b
      carve(grid, cell, d)
    }
  }
}

function wilson(grid: Grid, rng: Rng): void {
  const inMaze = new Uint8Array(grid.walls.length)
  const nextDir = new Int8Array(grid.walls.length)
  inMaze[randomInt(rng, grid.walls.length)] = 1
  for (let start = 0; start < grid.walls.length; start++) {
    if (inMaze[start]) continue
    // Random walk until hitting the maze; overwriting nextDir erases loops implicitly.
    let cell = start
    while (!inMaze[cell]) {
      const dirs = inBoundDirs(grid, cell)
      const d = dirs[randomInt(rng, dirs.length)]
      nextDir[cell] = d
      cell = neighbor(grid.width, grid.height, cell, d)
    }
    cell = start
    while (!inMaze[cell]) {
      inMaze[cell] = 1
      cell = carve(grid, cell, nextDir[cell])
    }
  }
}

function aldousBroder(grid: Grid, rng: Rng): void {
  const visited = new Uint8Array(grid.walls.length)
  let cell = randomInt(rng, grid.walls.length)
  visited[cell] = 1
  let remaining = grid.walls.length - 1
  while (remaining > 0) {
    const dirs = inBoundDirs(grid, cell)
    const d = dirs[randomInt(rng, dirs.length)]
    const next = neighbor(grid.width, grid.height, cell, d)
    if (!visited[next]) {
      carve(grid, cell, d)
      visited[next] = 1
      remaining--
    }
    cell = next
  }
}

function addLoops(grid: Grid, loopFactor: number, rng: Rng): void {
  const closed: [number, number][] = []
  for (let c = 0; c < grid.walls.length; c++) {
    for (const d of [1, 2]) {
      if (neighbor(grid.width, grid.height, c, d) !== -1 && grid.walls[c] & DIRS[d].bit) closed.push([c, d])
    }
  }
  const count = Math.round(closed.length * loopFactor)
  for (const [cell, d] of shuffle(rng, closed).slice(0, count)) carve(grid, cell, d)
}

const ALGORITHMS: Record<GeneratorId, (grid: Grid, rng: Rng) => void> = {
  backtracker,
  prim,
  kruskal,
  wilson,
  aldousBroder,
}

export function generateMaze(params: MazeParams): Maze {
  const { width, height, loopFactor, placement, seed } = params
  const grid: Grid = { width, height, walls: new Uint8Array(width * height).fill(15) }
  const rng = createRng(seed)
  ALGORITHMS[params.generator](grid, rng)
  if (loopFactor > 0) addLoops(grid, loopFactor, rng)
  const exit =
    placement === 'center' ? Math.floor(height / 2) * width + Math.floor(width / 2) : width * height - 1
  return { width, height, walls: grid.walls, start: 0, exit, seed }
}
