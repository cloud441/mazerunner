import { useEffect, useMemo, useRef } from 'react'
import { algorithmById, colorOf } from '../core/algorithms'
import type { Maze } from '../core/maze'
import type { RunResult } from '../core/run'
import { fmt, pct } from './format'
import { createPainter, type Painter } from './painter'

interface RacePanelProps {
  maze: Maze
  result: RunResult
  tick: number
  heatmap: boolean
}

export function RacePanel({ maze, result, tick, heatmap }: RacePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const painterRef = useRef<Painter | null>(null)
  const color = colorOf(result.algorithmId)
  const { trace, route, metrics } = result
  const lastTick = trace.length - 1
  const shown = Math.min(tick, lastTick)
  const finished = tick >= lastTick

  // uniqueSoFar[t] = distinct cells touched up to tick t, for the live coverage readout.
  const uniqueSoFar = useMemo(() => {
    const seen = new Uint8Array(maze.width * maze.height)
    const out = new Uint32Array(trace.length)
    let unique = 0
    trace.forEach((c, t) => {
      if (!seen[c]) {
        seen[c] = 1
        unique++
      }
      out[t] = unique
    })
    return out
  }, [maze, trace])

  useEffect(() => {
    painterRef.current = canvasRef.current && createPainter(canvasRef.current, maze, trace, route, color)
  }, [maze, trace, route, color])

  useEffect(() => {
    painterRef.current?.draw(tick, heatmap)
  }, [tick, heatmap, maze, trace, route, color])

  const status = !finished ? 'Exploring' : metrics.success ? 'Reached exit' : 'Failed'

  return (
    <article className="panel race-panel">
      <header className="panel-head">
        <span className="swatch" style={{ background: color }} aria-hidden />
        <h3>{algorithmById(result.algorithmId).label}</h3>
        <span className={`status status-${finished ? (metrics.success ? 'ok' : 'fail') : 'run'}`}>{status}</span>
      </header>
      <canvas
        ref={canvasRef}
        className="maze-canvas"
        style={{ aspectRatio: `${maze.width} / ${maze.height}` }}
        role="img"
        aria-label={`${algorithmById(result.algorithmId).label} exploring the maze, ${status.toLowerCase()}`}
      />
      <dl className="live-stats">
        <div>
          <dt>Tick</dt>
          <dd>
            {fmt(shown)} / {fmt(lastTick)}
          </dd>
        </div>
        <div>
          <dt>Explored</dt>
          <dd>{pct(uniqueSoFar[shown] / (maze.width * maze.height))}</dd>
        </div>
        {finished && (
          <>
            <div>
              <dt>Steps walked</dt>
              <dd>{fmt(metrics.stepsWalked)}</dd>
            </div>
            <div>
              <dt>Route / optimal</dt>
              <dd>{metrics.success ? `${fmt(metrics.routeLength)} / ${fmt(metrics.optimal)}` : '—'}</dd>
            </div>
            {metrics.expanded > 0 && (
              <div>
                <dt>Expanded</dt>
                <dd>{fmt(metrics.expanded)}</dd>
              </div>
            )}
            <div>
              <dt>Compute</dt>
              <dd>{metrics.timeMs.toFixed(1)} ms</dd>
            </div>
          </>
        )}
      </dl>
    </article>
  )
}
