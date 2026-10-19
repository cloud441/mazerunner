import { describe, expect, it } from 'vitest'
import { groupBy, logTicks, niceTicks, quantile, summarize } from './stats'

describe('summarize', () => {
  it('computes five-number summary and mean', () => {
    expect(summarize([5, 1, 3, 2, 4])).toEqual({ n: 5, min: 1, q1: 2, median: 3, q3: 4, max: 5, mean: 3 })
  })

  it('returns null for no data', () => {
    expect(summarize([])).toBeNull()
  })

  it('interpolates quantiles', () => {
    expect(quantile([0, 10], 0.25)).toBe(2.5)
  })
})

describe('niceTicks', () => {
  it('encloses the range with round steps', () => {
    expect(niceTicks(3, 97)).toEqual([0, 20, 40, 60, 80, 100])
    expect(niceTicks(0.93, 1.42)).toEqual([0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5])
  })

  it('handles a degenerate range', () => {
    expect(niceTicks(4, 4)).toEqual([4])
  })
})

describe('logTicks', () => {
  it('uses 1-2-5 steps enclosing the range', () => {
    expect(logTicks(1.3, 430)).toEqual([1, 2, 5, 10, 20, 50, 100, 200, 500])
  })

  it('refuses non-positive values', () => {
    expect(logTicks(0, 10)).toEqual([])
  })
})

it('groupBy keeps insertion order', () => {
  expect([...groupBy([1, 2, 3, 4], (n) => n % 2).entries()]).toEqual([
    [1, [1, 3]],
    [0, [2, 4]],
  ])
})
