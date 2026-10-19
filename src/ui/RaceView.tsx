import { useEffect, useMemo, useState } from 'react'
import { algorithmsFor, colorOf, SCENARIOS, type Scenario } from '../core/algorithms'
import { GENERATORS, generateMaze, type MazeParams } from '../core/generators'
import { shortestDistance } from '../core/maze'
import { randomSeed } from '../core/rng'
import { runAlgorithm } from '../core/run'
import { fmt } from './format'
import { HEAT_STEPS } from './painter'
import { RacePanel } from './RacePanel'

const MAX_RACERS = 4
const SPEEDS = [1, 2, 5, 10, 25, 50, 100, 250]
const DEFAULT_SPEED_INDEX = 3

const defaultSelection = (scenario: Scenario) => algorithmsFor(scenario).slice(0, MAX_RACERS).map((a) => a.id)

export function RaceView() {
  const [params, setParams] = useState<MazeParams>({
    generator: 'backtracker',
    width: 30,
    height: 30,
    loopFactor: 0,
    placement: 'corners',
    seed: randomSeed(),
  })
  const [scenario, setScenario] = useState<Scenario>('full')
  const [selected, setSelected] = useState<string[]>(() => defaultSelection('full'))
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX)
  const [heatmap, setHeatmap] = useState(false)

  const maze = useMemo(() => generateMaze(params), [params])
  const results = useMemo(() => {
    const optimal = shortestDistance(maze)
    return selected.map((id) => runAlgorithm(maze, id, optimal))
  }, [maze, selected])
  const maxTick = Math.max(0, ...results.map((r) => r.trace.length - 1))
  const speed = SPEEDS[speedIndex]
  const done = tick >= maxTick
  const isPlaying = playing && !done

  const restart = () => {
    setTick(0)
    setPlaying(false)
  }
  const updateParams = (patch: Partial<MazeParams>) => {
    setParams((p) => ({ ...p, ...patch }))
    restart()
  }
  const changeScenario = (next: Scenario) => {
    setScenario(next)
    setSelected(defaultSelection(next))
    restart()
  }
  const toggleAlgorithm = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_RACERS ? [...s, id] : s))
    restart()
  }
  const togglePlay = () => {
    if (done) setTick(0)
    setPlaying(!isPlaying)
  }

  useEffect(() => {
    if (!isPlaying) return
    let frame = requestAnimationFrame(function advance() {
      setTick((t) => Math.min(t + speed, maxTick))
      frame = requestAnimationFrame(advance)
    })
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, speed, maxTick])

  return (
    <div className="view race-view">
      <aside className="sidebar" aria-label="Race settings">
        <section>
          <h2>Maze</h2>
          <label>
            Generator
            <select value={params.generator} onChange={(e) => updateParams({ generator: e.target.value as MazeParams['generator'] })}>
              {GENERATORS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Size <output>{params.width} × {params.height}</output>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={params.width}
              onChange={(e) => updateParams({ width: Number(e.target.value), height: Number(e.target.value) })}
            />
          </label>
          <label>
            Loop factor <output>{Math.round(params.loopFactor * 100)}%</output>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={params.loopFactor}
              onChange={(e) => updateParams({ loopFactor: Number(e.target.value) })}
            />
          </label>
          <label>
            Exit
            <select value={params.placement} onChange={(e) => updateParams({ placement: e.target.value as MazeParams['placement'] })}>
              <option value="corners">Opposite corner</option>
              <option value="center">Center</option>
            </select>
          </label>
          <button type="button" className="primary" onClick={() => updateParams({ seed: randomSeed() })}>
            New maze
          </button>
          <p className="seed">seed {params.seed}</p>
        </section>

        <section>
          <h2>Scenario</h2>
          <div className="segmented" role="radiogroup" aria-label="Scenario">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={scenario === s.id}
                onClick={() => changeScenario(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="hint">{SCENARIOS.find((s) => s.id === scenario)?.description}</p>
        </section>

        <section>
          <h2>
            Racers <span className="count">{selected.length}/{MAX_RACERS}</span>
          </h2>
          <ul className="checklist">
            {algorithmsFor(scenario).map((a) => {
              const checked = selected.includes(a.id)
              const blocked = !checked && selected.length >= MAX_RACERS
              return (
                <li key={a.id}>
                  <label className={blocked ? 'disabled' : ''}>
                    <input type="checkbox" checked={checked} disabled={blocked} onChange={() => toggleAlgorithm(a.id)} />
                    <span className="swatch" style={{ background: colorOf(a.id) }} aria-hidden />
                    {a.label}
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      </aside>

      <section className="stage" aria-label="Race">
        <div className="toolbar" role="toolbar" aria-label="Playback">
          <button type="button" className="primary" onClick={togglePlay} disabled={results.length === 0}>
            {isPlaying ? 'Pause' : done && tick > 0 ? 'Replay' : 'Play'}
          </button>
          <button type="button" onClick={() => setTick((t) => Math.min(t + 1, maxTick))} disabled={done}>
            Step
          </button>
          <button type="button" onClick={() => setTick(maxTick)} disabled={done}>
            Finish
          </button>
          <button type="button" onClick={restart} disabled={tick === 0}>
            Reset
          </button>
          <label className="inline">
            Speed <output>{speed}×</output>
            <input type="range" min={0} max={SPEEDS.length - 1} value={speedIndex} onChange={(e) => setSpeedIndex(Number(e.target.value))} />
          </label>
          <label className="inline toggle">
            <input type="checkbox" checked={heatmap} onChange={(e) => setHeatmap(e.target.checked)} />
            Visit heatmap
          </label>
          <span className="tick">
            tick {fmt(Math.min(tick, maxTick))} / {fmt(maxTick)}
          </span>
        </div>
        <progress className="timeline" max={maxTick || 1} value={tick} aria-label="Race progress" />

        {results.length === 0 ? (
          <p className="empty">Select at least one algorithm to start a race.</p>
        ) : (
          <div className={`race-grid n${results.length}`}>
            {results.map((r) => (
              <RacePanel key={r.algorithmId} maze={maze} result={r} tick={tick} heatmap={heatmap} />
            ))}
          </div>
        )}

        <footer className="legend">
          <span>
            <i className="mark-start" aria-hidden /> start
          </span>
          <span>
            <i className="mark-exit" aria-hidden /> exit
          </span>
          {heatmap ? (
            <span className="heat-legend">
              visits
              {HEAT_STEPS.map((s, i) => {
                const next = HEAT_STEPS[i + 1]?.min
                const range = next === undefined ? `${s.min}+` : next - 1 > s.min ? `${s.min}–${next - 1}` : `${s.min}`
                return (
                  <span key={s.min}>
                    <i style={{ background: s.color }} aria-hidden />
                    {range}
                  </span>
                )
              })}
            </span>
          ) : (
            <span>darker trail = revisited cell · line = route found</span>
          )}
          <span>All racers advance together: one tick is one expansion for planners, one move for walkers.</span>
        </footer>
      </section>
    </div>
  )
}
