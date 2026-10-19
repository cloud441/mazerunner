import type { Scenario } from './algorithms'
import { generateMaze, type GeneratorId, type Placement } from './generators'
import { shortestDistance } from './maze'
import { createRng } from './rng'
import { runAlgorithm, type Metrics } from './run'

export interface BatchConfig {
  scenario: Scenario
  algorithmIds: string[]
  generators: GeneratorId[]
  sizes: number[]
  loopFactors: number[]
  mazesPerSetting: number
  placement: Placement
  baseSeed: number
}

export interface BatchRow extends Metrics {
  algorithmId: string
  generator: GeneratorId
  size: number
  loopFactor: number
  mazeIndex: number
  seed: number
}

export const LIMITS = { minSize: 5, maxSize: 100, maxLoopFactor: 0.5, maxMazes: 200, maxRuns: 50000 } as const

export const mazeCount = (c: BatchConfig) => c.generators.length * c.sizes.length * c.loopFactors.length * c.mazesPerSetting

export const runCount = (c: BatchConfig) => mazeCount(c) * c.algorithmIds.length

/** Returns human-readable problems; an empty list means the config can run. */
export function validateBatch(c: BatchConfig): string[] {
  const errors: string[] = []
  if (c.algorithmIds.length === 0) errors.push('Select at least one algorithm.')
  if (c.generators.length === 0) errors.push('Select at least one generator.')
  if (c.sizes.length === 0) errors.push('Enter at least one size.')
  if (c.sizes.some((s) => !Number.isInteger(s) || s < LIMITS.minSize || s > LIMITS.maxSize))
    errors.push(`Sizes must be whole numbers between ${LIMITS.minSize} and ${LIMITS.maxSize}.`)
  if (c.loopFactors.length === 0) errors.push('Enter at least one loop factor.')
  if (c.loopFactors.some((l) => !Number.isFinite(l) || l < 0 || l > LIMITS.maxLoopFactor))
    errors.push(`Loop factors must be between 0% and ${LIMITS.maxLoopFactor * 100}%.`)
  if (!Number.isInteger(c.mazesPerSetting) || c.mazesPerSetting < 1 || c.mazesPerSetting > LIMITS.maxMazes)
    errors.push(`Mazes per setting must be between 1 and ${LIMITS.maxMazes}.`)
  if (errors.length === 0 && runCount(c) > LIMITS.maxRuns)
    errors.push(`${runCount(c)} runs requested; the limit is ${LIMITS.maxRuns}.`)
  return errors
}

/** Every algorithm runs on the same mazes, so results are paired across algorithms. */
export function runBatch(config: BatchConfig, onProgress?: (doneMazes: number, totalMazes: number) => void): BatchRow[] {
  const rows: BatchRow[] = []
  const seeds = createRng(config.baseSeed)
  const total = mazeCount(config)
  let done = 0
  for (const generator of config.generators) {
    for (const size of config.sizes) {
      for (const loopFactor of config.loopFactors) {
        for (let mazeIndex = 0; mazeIndex < config.mazesPerSetting; mazeIndex++) {
          const seed = Math.floor(seeds() * 2 ** 32)
          const maze = generateMaze({ generator, width: size, height: size, loopFactor, placement: config.placement, seed })
          const optimal = shortestDistance(maze)
          for (const algorithmId of config.algorithmIds) {
            const { metrics } = runAlgorithm(maze, algorithmId, optimal)
            rows.push({ ...metrics, algorithmId, generator, size, loopFactor, mazeIndex, seed })
          }
          onProgress?.(++done, total)
        }
      }
    }
  }
  return rows
}
