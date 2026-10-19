import { useEffect, useRef, useState } from 'react'
import type { WorkerMessage } from '../batch.worker'
import { algorithmsFor, colorOf, SCENARIOS, type Scenario } from '../core/algorithms'
import { mazeCount, runCount, validateBatch, type BatchConfig, type BatchRow } from '../core/batch'
import { GENERATORS, type GeneratorId, type Placement } from '../core/generators'
import { randomSeed } from '../core/rng'
import { BatchResults } from './BatchResults'
import { fmt } from './format'

type Status = { kind: 'idle' } | { kind: 'running'; done: number; total: number } | { kind: 'error'; message: string }

interface Completed {
  rows: BatchRow[]
  config: BatchConfig
  elapsedMs: number
}

/** Parses "10, 20 30" into numbers; returns null if any token is not a number. */
function parseList(text: string): number[] | null {
  const tokens = text.split(/[\s,;]+/).filter(Boolean)
  const values = tokens.map(Number)
  return values.some((v) => !Number.isFinite(v)) ? null : values
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

export function BatchView() {
  const [scenario, setScenario] = useState<Scenario>('unknown')
  const [algorithmIds, setAlgorithmIds] = useState<string[]>(() => algorithmsFor('unknown').map((a) => a.id))
  const [generators, setGenerators] = useState<GeneratorId[]>(['backtracker', 'prim', 'wilson'])
  const [sizesText, setSizesText] = useState('10, 20, 40')
  const [loopsText, setLoopsText] = useState('0, 10')
  const [mazesPerSetting, setMazesPerSetting] = useState(20)
  const [placement, setPlacement] = useState<Placement>('corners')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [completed, setCompleted] = useState<Completed | null>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => () => workerRef.current?.terminate(), [])

  const sizes = parseList(sizesText)
  const loops = parseList(loopsText)
  const config: BatchConfig = {
    scenario,
    algorithmIds,
    generators,
    sizes: sizes ?? [],
    loopFactors: (loops ?? []).map((l) => l / 100),
    mazesPerSetting,
    placement,
    baseSeed: 0,
  }
  const errors = [
    ...(sizes === null ? ['Sizes must be a comma-separated list of numbers.'] : []),
    ...(loops === null ? ['Loop factors must be a comma-separated list of numbers.'] : []),
    ...validateBatch(config),
  ]

  const changeScenario = (next: Scenario) => {
    setScenario(next)
    setAlgorithmIds(algorithmsFor(next).map((a) => a.id))
  }

  const stop = () => {
    workerRef.current?.terminate()
    workerRef.current = null
    setStatus({ kind: 'idle' })
  }

  const start = () => {
    if (errors.length > 0) return
    const runConfig = { ...config, baseSeed: randomSeed() }
    workerRef.current?.terminate()
    const worker = new Worker(new URL('../batch.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    setStatus({ kind: 'running', done: 0, total: mazeCount(runConfig) })
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data
      if (message.type === 'progress') {
        setStatus({ kind: 'running', done: message.done, total: message.total })
        return
      }
      worker.terminate()
      workerRef.current = null
      if (message.type === 'done') {
        setCompleted({ rows: message.rows, config: runConfig, elapsedMs: message.elapsedMs })
        setStatus({ kind: 'idle' })
      } else {
        setStatus({ kind: 'error', message: message.message })
      }
    }
    worker.onerror = (event) => {
      worker.terminate()
      workerRef.current = null
      setStatus({ kind: 'error', message: event.message || 'The batch worker crashed.' })
    }
    worker.postMessage(runConfig)
  }

  const running = status.kind === 'running'

  return (
    <div className="view batch-view">
      <aside className="sidebar" aria-label="Batch settings">
        <section>
          <h2>Scenario</h2>
          <div className="segmented" role="radiogroup" aria-label="Scenario">
            {SCENARIOS.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={scenario === s.id} onClick={() => changeScenario(s.id)} disabled={running}>
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <fieldset disabled={running}>
          <legend>Algorithms</legend>
          <ul className="checklist">
            {algorithmsFor(scenario).map((a) => (
              <li key={a.id}>
                <label>
                  <input type="checkbox" checked={algorithmIds.includes(a.id)} onChange={() => setAlgorithmIds((ids) => toggle(ids, a.id))} />
                  <span className="swatch" style={{ background: colorOf(a.id) }} aria-hidden />
                  {a.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset disabled={running}>
          <legend>Generators</legend>
          <ul className="checklist">
            {GENERATORS.map((g) => (
              <li key={g.id}>
                <label>
                  <input type="checkbox" checked={generators.includes(g.id)} onChange={() => setGenerators((gs) => toggle(gs, g.id))} />
                  {g.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset disabled={running}>
          <legend>Grid</legend>
          <label>
            Sizes (N × N)
            <input type="text" inputMode="numeric" value={sizesText} onChange={(e) => setSizesText(e.target.value)} />
          </label>
          <label>
            Loop factors (%)
            <input type="text" inputMode="decimal" value={loopsText} onChange={(e) => setLoopsText(e.target.value)} />
          </label>
          <label>
            Mazes per setting
            <input type="number" min={1} max={200} value={mazesPerSetting} onChange={(e) => setMazesPerSetting(Number(e.target.value))} />
          </label>
          <label>
            Exit
            <select value={placement} onChange={(e) => setPlacement(e.target.value as Placement)}>
              <option value="corners">Opposite corner</option>
              <option value="center">Center</option>
            </select>
          </label>
        </fieldset>

        <section>
          <p className="run-size">
            {errors.length === 0 ? (
              <>
                {fmt(mazeCount(config))} mazes × {algorithmIds.length} algorithms = <strong>{fmt(runCount(config))} runs</strong>
              </>
            ) : (
              'Fix the settings below to run.'
            )}
          </p>
          {errors.length > 0 && (
            <ul className="errors" role="alert">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {running ? (
            <button type="button" onClick={stop}>
              Cancel
            </button>
          ) : (
            <button type="button" className="primary" onClick={start} disabled={errors.length > 0}>
              Run batch
            </button>
          )}
        </section>
      </aside>

      <section className="stage" aria-label="Batch results">
        {running && (
          <div className="progress-block" aria-live="polite">
            <progress max={status.total} value={status.done} aria-label="Batch progress" />
            <span>
              {fmt(status.done)} / {fmt(status.total)} mazes
            </span>
          </div>
        )}
        {status.kind === 'error' && (
          <p className="errors" role="alert">
            Batch failed: {status.message}
          </p>
        )}
        {completed ? (
          <>
            <p className="run-meta">
              {fmt(completed.rows.length)} runs · {SCENARIOS.find((s) => s.id === completed.config.scenario)?.label} · seed{' '}
              {completed.config.baseSeed} · {(completed.elapsedMs / 1000).toFixed(1)} s
            </p>
            <BatchResults rows={completed.rows} algorithmIds={completed.config.algorithmIds} />
          </>
        ) : (
          !running && (
            <div className="empty intro">
              <h2>Benchmark algorithms on many mazes</h2>
              <p>
                Every algorithm runs on the same set of mazes, so results are paired. Runs execute in a background worker; results stay in
                this session only.
              </p>
            </div>
          )
        )}
      </section>
    </div>
  )
}
