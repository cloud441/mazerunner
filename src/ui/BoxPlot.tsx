import { useState } from 'react'
import { logTicks, niceTicks, type Summary } from './stats'

export interface BoxGroup {
  id: string
  label: string
  color: string
  summary: Summary | null
}

interface BoxPlotProps {
  groups: BoxGroup[]
  /** Formats values in the readout and median column. */
  format: (n: number) => string
  /** Formats axis ticks, which need fewer decimals than values. */
  tickFormat: (n: number) => string
  log: boolean
}

const WIDTH = 960
const LABEL_W = 150
const VALUE_W = 70
const ROW_H = 34
const AXIS_H = 26
const BOX_H = 14

/** Horizontal box plot: whiskers at min/max, box at the interquartile range, ink tick at the median. */
export function BoxPlot({ groups, format, tickFormat, log }: BoxPlotProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const summaries = groups.flatMap((g) => (g.summary ? [g.summary] : []))
  const min = Math.min(...summaries.map((s) => s.min))
  const max = Math.max(...summaries.map((s) => s.max))
  const ticks = log ? logTicks(min, max) : niceTicks(min, max)
  if (ticks.length === 0) return <p className="empty">No successful runs to plot.</p>

  const scale = log ? Math.log10 : (v: number) => v
  const lo = scale(ticks[0])
  const hi = scale(ticks[ticks.length - 1])
  const plotW = WIDTH - LABEL_W - VALUE_W
  const x = (v: number) => LABEL_W + (hi === lo ? plotW / 2 : ((scale(v) - lo) / (hi - lo)) * plotW)
  const height = groups.length * ROW_H + AXIS_H
  const active = groups.find((g) => g.id === hovered)

  return (
    <figure className="chart">
      <p className="readout" aria-live="polite">
        {active?.summary
          ? `${active.label}: median ${format(active.summary.median)} · IQR ${format(active.summary.q1)}–${format(active.summary.q3)} · range ${format(active.summary.min)}–${format(active.summary.max)} · n=${active.summary.n}`
          : 'Hover a row for details.'}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label="Box plot per algorithm">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={x(t)} x2={x(t)} y1={0} y2={groups.length * ROW_H} />
            <text className="axis-label" x={x(t)} y={height - 8} textAnchor="middle">
              {tickFormat(t)}
            </text>
          </g>
        ))}
        {groups.map((g, i) => {
          const cy = i * ROW_H + ROW_H / 2
          const s = g.summary
          return (
            <g
              key={g.id}
              className={`box-row${hovered === g.id ? ' hovered' : ''}`}
              onMouseEnter={() => setHovered(g.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect className="hit" x={0} y={i * ROW_H} width={WIDTH} height={ROW_H} />
              <text className="row-label" x={LABEL_W - 12} y={cy + 4} textAnchor="end">
                {g.label}
              </text>
              {s ? (
                <>
                  <line stroke={g.color} strokeWidth={2} x1={x(s.min)} x2={x(s.max)} y1={cy} y2={cy} />
                  <line stroke={g.color} strokeWidth={2} x1={x(s.min)} x2={x(s.min)} y1={cy - 5} y2={cy + 5} />
                  <line stroke={g.color} strokeWidth={2} x1={x(s.max)} x2={x(s.max)} y1={cy - 5} y2={cy + 5} />
                  <rect
                    x={x(s.q1)}
                    y={cy - BOX_H / 2}
                    width={Math.max(2, x(s.q3) - x(s.q1))}
                    height={BOX_H}
                    rx={4}
                    fill={g.color}
                    fillOpacity={0.28}
                    stroke={g.color}
                    strokeWidth={2}
                  />
                  <line className="median" x1={x(s.median)} x2={x(s.median)} y1={cy - BOX_H / 2 - 2} y2={cy + BOX_H / 2 + 2} />
                  <text className="row-value" x={WIDTH - 4} y={cy + 4} textAnchor="end">
                    {format(s.median)}
                  </text>
                </>
              ) : (
                <text className="row-value muted" x={LABEL_W} y={cy + 4}>
                  no successful run
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
