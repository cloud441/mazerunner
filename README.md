# mazerunner

Browser lab for researching maze exploration: generate random mazes, race exploration algorithms side by side, and benchmark them over many mazes.

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests (Vitest)
npm run build   # typecheck + production build
```

## Model

- **Maze**: square grid (5–100 per side), 4-bit wall mask per cell. Generated as a perfect maze (spanning tree), then a *loop factor* removes that share of the remaining interior walls to create cycles.
- **Generators**: recursive backtracker, Prim, Kruskal, Wilson, Aldous-Broder. Every maze is seeded and reproducible.
- **Start / exit**: start top-left; exit bottom-right or at the center.

### Scenarios

| Scenario | Knowledge | Algorithms |
|---|---|---|
| Full maze known | whole graph | BFS, DFS, Dijkstra, A*, Greedy best-first, Dead-end filling |
| Exit known | exit cell + walls of the current cell, builds a map while walking | Re-planning A* (optimistic, re-plans on a blocked step), Greedy walker |
| Nothing known | walls of the current cell, recognises the exit on arrival | Wall follower, Pledge, Trémaux, Random mouse, DFS walk |

Walking agents are cut off after `20 × cells` steps; hitting the cap counts as a failure.

### Metrics

| Metric | Meaning |
|---|---|
| Steps walked | moves made; planners walk only their final route |
| Cells expanded | planning effort (planners and re-planning A*) |
| Route ratio | route found ÷ shortest path (1 = optimal) |
| Cost ratio | steps walked ÷ shortest path |
| Coverage | share of cells touched |
| Success | exit reached within the step cap |

Planner cost (expansions) and walker cost (steps) are reported separately: they are not directly comparable.

## Modes

- **Race**: one maze, up to 4 algorithms animated in lockstep (one tick = one expansion or one move), with a visit heatmap.
- **Batch benchmark**: generators × sizes × loop factors × N mazes, every algorithm on the same mazes, run in a Web Worker. Shows a summary table, box plots (linear/log) and trends vs size or loop factor. Results live in the session only.

## Layout

```
src/core/            pure, tested logic (maze model, generators, explorers, batch)
src/core/explorers/  one file per scenario
src/ui/              React views, canvas painter, charts
src/batch.worker.ts  batch runner off the main thread
```
