import { cellCount, openNeighbors, type Maze } from '../maze'
import type { Rng } from '../rng'

export interface Exploration {
  /** Cell occupied (walkers) or expanded (planners) at each animation tick. */
  trace: number[]
  /** Simple route from start to exit, empty when the exit was not reached. */
  route: number[]
  /** Cells expanded by a planner; 0 for agents that only walk. */
  expanded: number
  /** True when the trace is a physical walk, so its length is the walking cost. */
  walked: boolean
}

export type Explorer = (maze: Maze, rng: Rng) => Exploration

// Agents that can loop forever (random mouse, wall follower with loops) are cut off here; hitting it is a failure.
export const MAX_STEPS_PER_CELL = 20

export const stepLimit = (maze: Maze) => cellCount(maze) * MAX_STEPS_PER_CELL

/** Removes cycles from a walk, keeping the simple route it ended up following. */
export function loopErase(trace: readonly number[]): number[] {
  const route: number[] = []
  const position = new Map<number, number>()
  for (const cell of trace) {
    const seen = position.get(cell)
    if (seen !== undefined) {
      for (const removed of route.splice(seen + 1)) position.delete(removed)
    } else {
      position.set(cell, route.length)
      route.push(cell)
    }
  }
  return route
}

export function walkResult(maze: Maze, trace: number[], expanded = 0): Exploration {
  const reached = trace[trace.length - 1] === maze.exit
  return { trace, route: reached ? loopErase(trace) : [], expanded, walked: true }
}

/** Depth-first walk where `pick` chooses which unvisited neighbour to enter; backtracking costs steps. */
export function dfsWalk(maze: Maze, pick: (candidates: number[]) => number): Exploration {
  const visited = new Uint8Array(cellCount(maze))
  const stack = [maze.start]
  const trace = [maze.start]
  const limit = stepLimit(maze)
  visited[maze.start] = 1
  while (stack.length > 0 && trace.length <= limit) {
    const cell = stack[stack.length - 1]
    if (cell === maze.exit) break
    const candidates = openNeighbors(maze, cell).filter((n) => !visited[n])
    if (candidates.length > 0) {
      const next = pick(candidates)
      visited[next] = 1
      stack.push(next)
      trace.push(next)
    } else {
      stack.pop()
      if (stack.length > 0) trace.push(stack[stack.length - 1])
    }
  }
  return walkResult(maze, trace)
}

export function reconstruct(parent: Int32Array, exit: number): number[] {
  const route: number[] = []
  for (let c = exit; c !== -1; c = parent[c]) route.push(c)
  return route.reverse()
}

export class MinHeap<T> {
  private items: T[] = []
  private readonly less: (a: T, b: T) => boolean

  constructor(less: (a: T, b: T) => boolean) {
    this.less = less
  }

  get size(): number {
    return this.items.length
  }

  push(item: T): void {
    const items = this.items
    items.push(item)
    let i = items.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (!this.less(items[i], items[p])) break
      ;[items[i], items[p]] = [items[p], items[i]]
      i = p
    }
  }

  pop(): T | undefined {
    const items = this.items
    const top = items[0]
    const last = items.pop()
    if (items.length > 0 && last !== undefined) {
      items[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < items.length && this.less(items[l], items[m])) m = l
        if (r < items.length && this.less(items[r], items[m])) m = r
        if (m === i) break
        ;[items[i], items[m]] = [items[m], items[i]]
        i = m
      }
    }
    return top
  }
}
