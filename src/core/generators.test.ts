import { describe, expect, it } from 'vitest'
import { GENERATORS, generateMaze, type MazeParams } from './generators'
import { cellCount, openNeighbors, type Maze } from './maze'

const params = (overrides: Partial<MazeParams> = {}): MazeParams => ({
  generator: 'backtracker',
  width: 15,
  height: 11,
  loopFactor: 0,
  placement: 'corners',
  seed: 42,
  ...overrides,
})

const passageCount = (maze: Maze) =>
  Array.from({ length: cellCount(maze) }, (_, c) => openNeighbors(maze, c).length).reduce((a, b) => a + b, 0) / 2

function reachable(maze: Maze): number {
  const seen = new Set([maze.start])
  const queue = [maze.start]
  for (let i = 0; i < queue.length; i++) {
    for (const n of openNeighbors(maze, queue[i])) {
      if (!seen.has(n)) {
        seen.add(n)
        queue.push(n)
      }
    }
  }
  return seen.size
}

describe.each(GENERATORS.map((g) => g.id))('%s generator', (generator) => {
  it('produces a perfect maze: connected spanning tree', () => {
    const maze = generateMaze(params({ generator }))
    expect(reachable(maze)).toBe(cellCount(maze))
    expect(passageCount(maze)).toBe(cellCount(maze) - 1)
  })

  it('is deterministic for a given seed', () => {
    expect(generateMaze(params({ generator })).walls).toEqual(generateMaze(params({ generator })).walls)
  })

  it('keeps wall bits consistent between neighbours and closed on the border', () => {
    const maze = generateMaze(params({ generator, loopFactor: 0.2 }))
    for (let c = 0; c < cellCount(maze); c++) {
      for (const n of openNeighbors(maze, c)) expect(openNeighbors(maze, n)).toContain(c)
    }
    for (let x = 0; x < maze.width; x++) {
      expect(maze.walls[x] & 1).toBe(1)
      expect(maze.walls[(maze.height - 1) * maze.width + x] & 4).toBe(4)
    }
  })
})

describe('loop factor', () => {
  it('adds passages proportionally to the remaining walls', () => {
    const perfect = generateMaze(params())
    const loopy = generateMaze(params({ loopFactor: 0.25 }))
    expect(passageCount(loopy)).toBeGreaterThan(passageCount(perfect))
  })
})

describe('placement', () => {
  it('puts the exit at the opposite corner or the centre', () => {
    expect(generateMaze(params()).exit).toBe(15 * 11 - 1)
    expect(generateMaze(params({ placement: 'center' })).exit).toBe(5 * 15 + 7)
  })
})
