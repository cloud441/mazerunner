// Scenario "full maze known": planners search the whole graph, then walk the route they found.
import { cellCount, manhattan, openNeighbors, type Maze } from '../maze'
import { MinHeap, reconstruct, type Exploration, type Explorer } from './common'

interface Entry {
  cell: number
  from: number
  g: number
  priority: number
  order: number
}

const byPriority = (a: Entry, b: Entry) => a.priority < b.priority || (a.priority === b.priority && a.order < b.order)

/**
 * Generic best-first search. `priority` orders the frontier; `reopen` lets a cell be pushed again
 * after discovery (needed for DFS stack semantics, where the latest discovery wins).
 */
function bestFirst(priority: (g: number, h: number, order: number) => number, reopen = false): Explorer {
  return (maze: Maze): Exploration => {
    const n = cellCount(maze)
    const closed = new Uint8Array(n)
    const bestG = new Int32Array(n).fill(-1)
    const parent = new Int32Array(n).fill(-1)
    const heap = new MinHeap<Entry>(byPriority)
    const trace: number[] = []
    let order = 0
    const push = (cell: number, from: number, g: number) => {
      bestG[cell] = g
      const h = manhattan(maze.width, cell, maze.exit)
      heap.push({ cell, from, g, priority: priority(g, h, order), order: order++ })
    }
    push(maze.start, -1, 0)
    while (heap.size > 0) {
      const { cell, from, g } = heap.pop()!
      if (closed[cell]) continue
      closed[cell] = 1
      parent[cell] = from
      trace.push(cell)
      if (cell === maze.exit) break
      for (const next of openNeighbors(maze, cell)) {
        if (closed[next]) continue
        if (reopen || bestG[next] === -1 || g + 1 < bestG[next]) push(next, cell, g + 1)
      }
    }
    const route = closed[maze.exit] ? reconstruct(parent, maze.exit) : []
    return { trace, route, expanded: trace.length, walked: false }
  }
}

export const bfs = bestFirst((_g, _h, order) => order)
export const dfs = bestFirst((_g, _h, order) => -order, true)
// On an unweighted grid Dijkstra expands in the same distance order as BFS; ties are broken FIFO.
export const dijkstra = bestFirst((g) => g)
export const astar = bestFirst((g, h) => g + h)
export const greedy = bestFirst((_g, h) => h)

/** Fills dead ends until none remain, then BFS over the surviving cells picks the route. */
export const deadEndFill: Explorer = (maze) => {
  const n = cellCount(maze)
  const filled = new Uint8Array(n)
  const degree = Int32Array.from({ length: n }, (_, c) => openNeighbors(maze, c).length)
  const isTerminal = (c: number) => c === maze.start || c === maze.exit
  const queue: number[] = []
  for (let c = 0; c < n; c++) if (degree[c] <= 1 && !isTerminal(c)) queue.push(c)
  const trace: number[] = []
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head]
    if (filled[cell]) continue
    filled[cell] = 1
    trace.push(cell)
    for (const next of openNeighbors(maze, cell)) {
      if (filled[next]) continue
      degree[next]--
      if (degree[next] === 1 && !isTerminal(next)) queue.push(next)
    }
  }
  // With loops, several corridors survive the filling, so a BFS over the remainder is still needed.
  const parent = new Int32Array(n).fill(-1)
  const seen = new Uint8Array(n)
  const bfsQueue = [maze.start]
  seen[maze.start] = 1
  for (let head = 0; head < bfsQueue.length; head++) {
    const cell = bfsQueue[head]
    trace.push(cell)
    if (cell === maze.exit) break
    for (const next of openNeighbors(maze, cell)) {
      if (filled[next] || seen[next]) continue
      seen[next] = 1
      parent[next] = cell
      bfsQueue.push(next)
    }
  }
  const route = seen[maze.exit] ? reconstruct(parent, maze.exit) : []
  return { trace, route, expanded: trace.length, walked: false }
}
