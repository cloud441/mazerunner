import type { Explorer } from './explorers/common'
import { greedyWalker, replanningAstar } from './explorers/exitKnown'
import { astar, bfs, deadEndFill, dfs, dijkstra, greedy } from './explorers/full'
import { dfsExplorer, pledge, randomMouse, tremaux, wallFollower } from './explorers/unknown'

export type Scenario = 'full' | 'exitKnown' | 'unknown'

export const SCENARIOS: readonly { id: Scenario; label: string; description: string }[] = [
  { id: 'full', label: 'Full maze known', description: 'Planner sees the whole graph, then walks its route.' },
  {
    id: 'exitKnown',
    label: 'Exit known',
    description: 'Agent knows the exit cell, sees only the walls of its own cell and maps as it walks.',
  },
  { id: 'unknown', label: 'Nothing known', description: 'Agent sees only its own walls and recognises the exit on arrival.' },
]

export interface AlgorithmDef {
  id: string
  label: string
  scenario: Scenario
  run: Explorer
}

export const ALGORITHMS: readonly AlgorithmDef[] = [
  { id: 'bfs', label: 'BFS', scenario: 'full', run: bfs },
  { id: 'dfs', label: 'DFS', scenario: 'full', run: dfs },
  { id: 'dijkstra', label: 'Dijkstra', scenario: 'full', run: dijkstra },
  { id: 'astar', label: 'A*', scenario: 'full', run: astar },
  { id: 'greedy', label: 'Greedy best-first', scenario: 'full', run: greedy },
  { id: 'deadEnd', label: 'Dead-end filling', scenario: 'full', run: deadEndFill },
  { id: 'replanAstar', label: 'Re-planning A*', scenario: 'exitKnown', run: replanningAstar },
  { id: 'greedyWalk', label: 'Greedy walker', scenario: 'exitKnown', run: greedyWalker },
  { id: 'wallFollower', label: 'Wall follower', scenario: 'unknown', run: wallFollower },
  { id: 'pledge', label: 'Pledge', scenario: 'unknown', run: pledge },
  { id: 'tremaux', label: 'Trémaux', scenario: 'unknown', run: tremaux },
  { id: 'randomMouse', label: 'Random mouse', scenario: 'unknown', run: randomMouse },
  { id: 'dfsWalk', label: 'DFS walk', scenario: 'unknown', run: dfsExplorer },
]

// Validated categorical order (dataviz reference palette, light mode). Colour follows the algorithm, never its rank.
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']

export const algorithmsFor = (scenario: Scenario) => ALGORITHMS.filter((a) => a.scenario === scenario)

export function algorithmById(id: string): AlgorithmDef {
  const found = ALGORITHMS.find((a) => a.id === id)
  if (!found) throw new Error(`Unknown algorithm: ${id}`)
  return found
}

export function colorOf(id: string): string {
  const def = algorithmById(id)
  return PALETTE[algorithmsFor(def.scenario).indexOf(def) % PALETTE.length]
}
