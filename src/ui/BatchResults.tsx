import { useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { algorithmById, colorOf } from '../core/algorithms'
import type { BatchRow } from '../core/batch'
import { GENERATORS } from '../core/generators'
import { BoxPlot } from './BoxPlot'
import { dec, fmt, pct } from './format'
import { groupBy, METRICS, metricValues, summarize, type MetricKey } from './stats'

interface BatchResultsProps {
  rows: BatchRow[]
  algorithmIds: string[]
}

type TrendAxis = 'size' | 'loopFactor'

const formatterFor = (key: MetricKey) => (key === 'coverage' ? pct : key === 'costRatio' || key === 'routeRatio' || key === 'timeMs' ? dec : fmt)

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

const axisFormatterFor = (key: MetricKey) => (key === 'coverage' ? (v: number) => `${Math.round(v * 100)}%` : (v: number) => `${Number(v.toPrecision(4))}`)

export function BatchResults({ rows, algorithmIds }: BatchResultsProps) {
  const [metric, setMetric] = useState<MetricKey>('costRatio')
  const [axis, setAxis] = useState<TrendAxis>('size')
  const [generator, setGenerator] = useState<string>('all')
  const [logScale, setLogScale] = useState(false)
  const format = formatterFor(metric)
  const axisFormat = axisFormatterFor(metric)
  const metricDef = METRICS.find((m) => m.key === metric)!

  const generatorsInRun = useMemo(() => [...new Set(rows.map((r) => r.generator))], [rows])
  const filtered = useMemo(() => (generator === 'all' ? rows : rows.filter((r) => r.generator === generator)), [rows, generator])
  const byAlgorithm = useMemo(() => groupBy(filtered, (r) => r.algorithmId), [filtered])
  // A log axis needs strictly positive data (e.g. walkers have 0 cells expanded).
  const canLog = useMemo(() => metricValues(filtered, metric).every((v) => v > 0), [filtered, metric])
  const log = logScale && canLog

  const trend = useMemo(() => {
    const byX = groupBy(filtered, (r) => r[axis])
    return [...byX.keys()]
      .sort((a, b) => a - b)
      .map((x) => {
        const point: Record<string, number | null> = { x }
        const group = groupBy(byX.get(x)!, (r) => r.algorithmId)
        for (const id of algorithmIds) point[id] = mean(metricValues(group.get(id) ?? [], metric))
        return point
      })
  }, [filtered, axis, metric, algorithmIds])

  return (
    <div className="results">
      <div className="filters" role="group" aria-label="Result filters">
        <label className="inline">
          Metric
          <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline">
          Generator
          <select value={generator} onChange={(e) => setGenerator(e.target.value)}>
            <option value="all">All</option>
            {generatorsInRun.map((g) => (
              <option key={g} value={g}>
                {GENERATORS.find((x) => x.id === g)?.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline" title={canLog ? undefined : 'This metric has zero values'}>
          <input type="checkbox" checked={log} disabled={!canLog} onChange={(e) => setLogScale(e.target.checked)} />
          Log scale
        </label>
        <span className="hint">{metricDef.hint} Ratios and distributions use successful runs only.</span>
      </div>

      <section className="panel">
        <h3>Summary</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Algorithm</th>
                <th scope="col">Runs</th>
                <th scope="col">Success</th>
                <th scope="col">Steps (median)</th>
                <th scope="col">Cost ratio</th>
                <th scope="col">Route ratio</th>
                <th scope="col">Coverage</th>
                <th scope="col">Expanded</th>
                <th scope="col">Time ms</th>
              </tr>
            </thead>
            <tbody>
              {algorithmIds.map((id) => {
                const group = byAlgorithm.get(id) ?? []
                const successes = group.filter((r) => r.success).length
                const avg = (key: MetricKey) => mean(metricValues(group, key))
                const show = (v: number | null, f: (n: number) => string) => (v === null ? '—' : f(v))
                return (
                  <tr key={id}>
                    <th scope="row">
                      <span className="swatch" style={{ background: colorOf(id) }} aria-hidden />
                      {algorithmById(id).label}
                    </th>
                    <td>{fmt(group.length)}</td>
                    <td className={successes < group.length ? 'warn' : ''}>{group.length ? pct(successes / group.length) : '—'}</td>
                    <td>{show(summarize(metricValues(group, 'stepsWalked'))?.median ?? null, fmt)}</td>
                    <td>{show(avg('costRatio'), dec)}</td>
                    <td>{show(avg('routeRatio'), dec)}</td>
                    <td>{show(avg('coverage'), pct)}</td>
                    <td>{show(avg('expanded'), fmt)}</td>
                    <td>{show(avg('timeMs'), dec)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">Cost, route, coverage, expanded and time are means over successful runs.</p>
      </section>

      <section className="panel">
        <h3>Distribution · {metricDef.label}</h3>
        <BoxPlot
          format={format}
          tickFormat={axisFormat}
          log={log}
          groups={algorithmIds.map((id) => ({
            id,
            label: algorithmById(id).label,
            color: colorOf(id),
            summary: summarize(metricValues(byAlgorithm.get(id) ?? [], metric)),
          }))}
        />
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h3>Trend · mean {metricDef.label.toLowerCase()}</h3>
          <div className="segmented small" role="radiogroup" aria-label="Trend axis">
            {(['size', 'loopFactor'] as const).map((a) => (
              <button key={a} type="button" role="radio" aria-checked={axis === a} onClick={() => setAxis(a)}>
                vs {a === 'size' ? 'maze size' : 'loop factor'}
              </button>
            ))}
          </div>
        </div>
        {trend.length < 2 ? (
          <p className="empty">Run the batch with at least two {axis === 'size' ? 'sizes' : 'loop factors'} to see a trend.</p>
        ) : (
          <div className="line-chart">
            <ResponsiveContainer width="100%" height={300} initialDimension={{ width: 900, height: 300 }}>
              <LineChart data={trend} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  ticks={trend.map((p) => p.x as number)}
                  tickFormatter={(v: number) => (axis === 'loopFactor' ? `${Math.round(v * 100)}%` : `${v}`)}
                  stroke="var(--ink-3)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  scale={log ? 'log' : 'auto'}
                  domain={log ? ['auto', 'auto'] : [0, 'auto']}
                  stroke="var(--ink-3)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={axisFormat}
                  width={56}
                />
                <Tooltip
                  formatter={(v, name) => [typeof v === 'number' ? format(v) : '—', algorithmById(String(name)).label]}
                  labelFormatter={(v) => (axis === 'loopFactor' ? `loop ${Math.round(Number(v) * 100)}%` : `size ${v}×${v}`)}
                />
                <Legend formatter={(id) => <span className="legend-label">{algorithmById(String(id)).label}</span>} />
                {algorithmIds.map((id) => (
                  <Line key={id} dataKey={id} stroke={colorOf(id)} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
