import { describe, expect, it } from 'vitest'
import { runBatch, runCount, validateBatch, type BatchConfig } from './batch'

const config: BatchConfig = {
  scenario: 'full',
  algorithmIds: ['bfs', 'astar'],
  generators: ['kruskal', 'wilson'],
  sizes: [8, 12],
  loopFactors: [0, 0.1],
  mazesPerSetting: 3,
  placement: 'corners',
  baseSeed: 1,
}

describe('runBatch', () => {
  it('produces one row per algorithm per maze and reports progress', () => {
    const progress: number[] = []
    const rows = runBatch(config, (done) => progress.push(done))
    expect(rows).toHaveLength(runCount(config))
    expect(progress.at(-1)).toBe(24)
  })

  it('runs every algorithm on the same maze', () => {
    const rows = runBatch(config)
    const bfs = rows.filter((r) => r.algorithmId === 'bfs').map((r) => r.seed)
    const astar = rows.filter((r) => r.algorithmId === 'astar').map((r) => r.seed)
    expect(bfs).toEqual(astar)
  })
})

describe('validateBatch', () => {
  it('accepts a valid config', () => {
    expect(validateBatch(config)).toEqual([])
  })

  it('rejects out-of-range input', () => {
    const errors = validateBatch({ ...config, sizes: [3, 500], loopFactors: [0.9], mazesPerSetting: 0, algorithmIds: [] })
    expect(errors).toHaveLength(4)
  })

  it('caps the total number of runs', () => {
    // 2 generators x 8 sizes x 4 loop factors x 200 mazes x 4 algorithms = 51200 runs
    const huge = {
      ...config,
      algorithmIds: ['bfs', 'dfs', 'astar', 'greedy'],
      mazesPerSetting: 200,
      sizes: [10, 20, 30, 40, 50, 60, 70, 80],
      loopFactors: [0, 0.1, 0.2, 0.3],
    }
    expect(validateBatch(huge)).toHaveLength(1)
  })
})
