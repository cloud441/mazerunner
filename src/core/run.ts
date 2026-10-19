import { algorithmById } from './algorithms'
import { cellCount, shortestDistance, type Maze } from './maze'
import { createRng } from './rng'

export interface Metrics {
  success: boolean
  /** Moves physically walked: the whole trace for agents, the planned route for planners. */
  stepsWalked: number
  routeLength: number
  optimal: number
  /** Planning effort (cells expanded); 0 for pure walkers. */
  expanded: number
  /** Share of maze cells touched by the trace, 0..1. */
  coverage: number
  /** stepsWalked / optimal; null on failure. 1 is perfect. */
  costRatio: number | null
  /** routeLength / optimal; null on failure. 1 means the shortest route was found. */
  routeRatio: number | null
  timeMs: number
}

export interface RunResult {
  algorithmId: string
  trace: number[]
  route: number[]
  metrics: Metrics
}

export function runAlgorithm(maze: Maze, algorithmId: string, optimal = shortestDistance(maze)): RunResult {
  const def = algorithmById(algorithmId)
  const t0 = performance.now()
  // Per-algorithm seed so randomised agents differ from the generator stream but stay reproducible.
  const exploration = def.run(maze, createRng(maze.seed ^ hash(algorithmId)))
  const timeMs = performance.now() - t0
  const { trace, route, expanded, walked } = exploration
  const success = route.length > 0
  const routeLength = success ? route.length - 1 : 0
  const stepsWalked = walked ? trace.length - 1 : routeLength
  const ratio = (value: number) => (success && optimal > 0 ? value / optimal : null)
  return {
    algorithmId,
    trace,
    route,
    metrics: {
      success,
      stepsWalked,
      routeLength,
      optimal,
      expanded,
      coverage: new Set(trace).size / cellCount(maze),
      costRatio: ratio(stepsWalked),
      routeRatio: ratio(routeLength),
      timeMs,
    },
  }
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}
