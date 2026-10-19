import { describe, expect, it } from 'vitest'
import { ALGORITHMS } from '../algorithms'
import { generateMaze } from '../generators'
import { isValidRoute, shortestDistance } from '../maze'
import { runAlgorithm } from '../run'
import { loopErase, MinHeap, stepLimit } from './common'

const perfect = generateMaze({ generator: 'backtracker', width: 20, height: 20, loopFactor: 0, placement: 'corners', seed: 7 })
const loopy = generateMaze({ generator: 'prim', width: 20, height: 20, loopFactor: 0.15, placement: 'center', seed: 9 })

// Algorithms with a completeness guarantee on any connected maze.
const COMPLETE = ['bfs', 'dfs', 'dijkstra', 'astar', 'greedy', 'deadEnd', 'replanAstar', 'greedyWalk', 'tremaux', 'dfsWalk']
const OPTIMAL = ['bfs', 'dijkstra', 'astar', 'deadEnd']

describe.each([
  ['perfect', perfect],
  ['loopy', loopy],
])('on a %s maze', (_name, maze) => {
  const optimal = shortestDistance(maze)

  it.each(ALGORITHMS.map((a) => a.id))('%s returns a valid route or fails within the step limit', (id) => {
    const result = runAlgorithm(maze, id)
    if (result.metrics.success) expect(isValidRoute(maze, result.route)).toBe(true)
    expect(result.trace.length).toBeLessThanOrEqual(stepLimit(maze) + 1)
    expect(result.metrics.optimal).toBe(optimal)
  })

  it.each(COMPLETE)('%s always reaches the exit', (id) => {
    expect(runAlgorithm(maze, id).metrics.success).toBe(true)
  })

  it.each(OPTIMAL)('%s finds a shortest route', (id) => {
    expect(runAlgorithm(maze, id).metrics.routeLength).toBe(optimal)
  })

  it('walkers spend at least the optimal number of steps', () => {
    for (const id of ['replanAstar', 'greedyWalk', 'tremaux', 'dfsWalk']) {
      expect(runAlgorithm(maze, id).metrics.stepsWalked).toBeGreaterThanOrEqual(optimal)
    }
  })
})

it('wall follower solves a perfect maze', () => {
  expect(runAlgorithm(perfect, 'wallFollower').metrics.success).toBe(true)
})

it('runs are reproducible for randomised agents', () => {
  expect(runAlgorithm(loopy, 'randomMouse').trace).toEqual(runAlgorithm(loopy, 'randomMouse').trace)
})

describe('loopErase', () => {
  it('removes cycles from a walk', () => {
    expect(loopErase([0, 1, 2, 1, 3, 4, 3, 5])).toEqual([0, 1, 3, 5])
    expect(loopErase([0, 1, 2, 3, 0, 4])).toEqual([0, 4])
  })
})

describe('MinHeap', () => {
  it('pops in ascending order', () => {
    const heap = new MinHeap<number>((a, b) => a < b)
    for (const v of [5, 3, 8, 1, 9, 2]) heap.push(v)
    const out: number[] = []
    while (heap.size > 0) out.push(heap.pop()!)
    expect(out).toEqual([1, 2, 3, 5, 8, 9])
  })
})
