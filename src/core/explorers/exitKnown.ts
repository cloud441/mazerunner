// Scenario "exit known, maze unknown": the agent knows the exit cell and sees only the walls of the cell it stands on.
import { cellCount, directionTo, isOpen, manhattan, neighbor, type Maze } from '../maze'
import { dfsWalk, MinHeap, reconstruct, stepLimit, walkResult, type Explorer } from './common'

interface Node {
  cell: number
  g: number
  f: number
}

/** A* on the agent's belief map: walls of observed cells are known, everything else is assumed open. */
function planOptimistic(maze: Maze, observed: Uint8Array, from: number): { route: number[]; expanded: number } {
  const n = cellCount(maze)
  const bestG = new Int32Array(n).fill(-1)
  const parent = new Int32Array(n).fill(-1)
  const closed = new Uint8Array(n)
  const heap = new MinHeap<Node>((a, b) => a.f < b.f || (a.f === b.f && a.g > b.g))
  heap.push({ cell: from, g: 0, f: manhattan(maze.width, from, maze.exit) })
  bestG[from] = 0
  let expanded = 0
  while (heap.size > 0) {
    const { cell, g } = heap.pop()!
    if (closed[cell]) continue
    closed[cell] = 1
    expanded++
    if (cell === maze.exit) return { route: reconstruct(parent, maze.exit).slice(1), expanded }
    for (let d = 0; d < 4; d++) {
      const next = neighbor(maze.width, maze.height, cell, d)
      if (next === -1 || closed[next]) continue
      const known = observed[cell] || observed[next]
      if (known && !isOpen(maze, cell, d)) continue
      if (bestG[next] !== -1 && bestG[next] <= g + 1) continue
      bestG[next] = g + 1
      parent[next] = cell
      heap.push({ cell: next, g: g + 1, f: g + 1 + manhattan(maze.width, next, maze.exit) })
    }
  }
  return { route: [], expanded }
}

/** Follows its optimistic plan and re-plans whenever the next step turns out to be walled. */
export const replanningAstar: Explorer = (maze) => {
  const observed = new Uint8Array(cellCount(maze))
  const limit = stepLimit(maze)
  const trace = [maze.start]
  let position = maze.start
  let plan: number[] = []
  let planIndex = 0
  let expanded = 0
  observed[position] = 1
  while (position !== maze.exit && trace.length <= limit) {
    const next = plan[planIndex]
    if (next === undefined || !isOpen(maze, position, directionTo(maze.width, position, next))) {
      const result = planOptimistic(maze, observed, position)
      expanded += result.expanded
      if (result.route.length === 0) break
      plan = result.route
      planIndex = 0
      continue
    }
    position = next
    planIndex++
    observed[position] = 1
    trace.push(position)
  }
  return walkResult(maze, trace, expanded)
}

/** Depth-first walk that always enters the unvisited neighbour closest to the exit. */
export const greedyWalker: Explorer = (maze) =>
  dfsWalk(maze, (candidates) =>
    candidates.reduce((best, c) =>
      manhattan(maze.width, c, maze.exit) < manhattan(maze.width, best, maze.exit) ? c : best,
    ),
  )
