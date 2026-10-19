import type { BatchRow } from '../core/batch'

export interface Summary {
  n: number
  min: number
  q1: number
  median: number
  q3: number
  max: number
  mean: number
}

export type MetricKey = 'stepsWalked' | 'costRatio' | 'routeRatio' | 'coverage' | 'expanded' | 'timeMs'

export const METRICS: readonly { key: MetricKey; label: string; hint: string }[] = [
  { key: 'stepsWalked', label: 'Steps walked', hint: 'Moves made; planners walk only their route.' },
  { key: 'costRatio', label: 'Cost ratio', hint: 'Steps walked ÷ shortest path. 1 is perfect.' },
  { key: 'routeRatio', label: 'Route ratio', hint: 'Route found ÷ shortest path. 1 is optimal.' },
  { key: 'coverage', label: 'Coverage', hint: 'Share of maze cells touched.' },
  { key: 'expanded', label: 'Cells expanded', hint: 'Planning effort; 0 for pure walkers.' },
  { key: 'timeMs', label: 'Compute time (ms)', hint: 'Wall-clock time of the algorithm itself.' },
]

/** Linear-interpolated quantile of an ascending-sorted array. */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function summarize(values: readonly number[]): Summary | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return {
    n: sorted.length,
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
  }
}

/** Metric values from successful runs only: failed runs have no meaningful cost or route. */
export const metricValues = (rows: readonly BatchRow[], key: MetricKey) =>
  rows.filter((r) => r.success).map((r) => r[key]).filter((v): v is number => v !== null)

export function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const group = groups.get(k)
    if (group) group.push(item)
    else groups.set(k, [item])
  }
  return groups
}

/** 1-2-5 ticks per decade enclosing [min, max]; empty when the range is not strictly positive. */
export function logTicks(min: number, max: number): number[] {
  if (!(min > 0) || !Number.isFinite(max)) return []
  const steps = [1, 2, 5]
  const all: number[] = []
  for (let d = Math.floor(Math.log10(min)); d <= Math.ceil(Math.log10(max)); d++) {
    for (const s of steps) all.push(Number((s * 10 ** d).toPrecision(12)))
  }
  const first = all.findLastIndex((t) => t <= min)
  const last = all.findIndex((t) => t >= max)
  return all.slice(Math.max(0, first), last + 1)
}

/** Round, human-friendly axis ticks whose first and last values enclose [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) return [min]
  const raw = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const first = Math.floor(min / step)
  const last = Math.ceil(max / step)
  return Array.from({ length: last - first + 1 }, (_, i) => Number(((first + i) * step).toPrecision(12)))
}
