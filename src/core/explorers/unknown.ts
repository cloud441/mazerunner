// Scenario "nothing known": the agent sees only the walls of its current cell and recognises the exit on arrival.
import { cellCount, isOpen, neighbor, type Maze } from '../maze'
import { randomInt } from '../rng'
import { dfsWalk, stepLimit, walkResult, type Explorer } from './common'

// Turn offsets relative to heading, in right-hand preference order: right, straight, left, back.
const RIGHT_HAND = [1, 0, 3, 2]
// Signed turn count for each RIGHT_HAND entry (right = +1, left = -1, back = two rights).
const TURN_COST = [1, 0, -1, 2]

const move = (maze: Maze, cell: number, d: number) => neighbor(maze.width, maze.height, cell, d)

const firstOpenDir = (maze: Maze, cell: number) => [0, 1, 2, 3].find((d) => isOpen(maze, cell, d)) ?? -1

export const wallFollower: Explorer = (maze) => {
  const limit = stepLimit(maze)
  const trace = [maze.start]
  let position = maze.start
  let heading = firstOpenDir(maze, position)
  while (heading !== -1 && position !== maze.exit && trace.length <= limit) {
    const turn = RIGHT_HAND.find((t) => isOpen(maze, position, (heading + t) % 4))
    if (turn === undefined) break
    heading = (heading + turn) % 4
    position = move(maze, position, heading)
    trace.push(position)
  }
  return walkResult(maze, trace)
}

/** Pledge: go straight in a preferred direction, wall-follow when blocked until the turn count is back to zero. */
export const pledge: Explorer = (maze, rng) => {
  const limit = stepLimit(maze)
  const trace = [maze.start]
  const preferred = randomInt(rng, 4)
  let position = maze.start
  let heading = preferred
  let turns = 0
  while (position !== maze.exit && trace.length <= limit) {
    if (turns === 0) {
      // Facing the preferred direction: rotate left until a passage opens, which puts the wall on our right.
      let rotations = 0
      while (!isOpen(maze, position, heading) && rotations < 4) {
        heading = (heading + 3) % 4
        turns--
        rotations++
      }
      if (rotations === 4) break
    } else {
      const i = RIGHT_HAND.findIndex((t) => isOpen(maze, position, (heading + t) % 4))
      if (i === -1) break
      heading = (heading + RIGHT_HAND[i]) % 4
      turns += TURN_COST[i]
    }
    position = move(maze, position, heading)
    trace.push(position)
  }
  return walkResult(maze, trace)
}

/** Trémaux: mark passages as they are walked; never take a passage marked twice. */
export const tremaux: Explorer = (maze, rng) => {
  const marks = new Uint8Array(cellCount(maze) * 4)
  const limit = stepLimit(maze)
  const trace = [maze.start]
  let position = maze.start
  let back = -1
  while (position !== maze.exit && trace.length <= limit) {
    const cell = position
    const others = [0, 1, 2, 3].filter((d) => d !== back && isOpen(maze, cell, d))
    const mark = (d: number) => marks[cell * 4 + d]
    let d: number
    if (others.length === 0) {
      d = back
    } else if (back !== -1 && mark(back) === 1 && others.some((o) => mark(o) > 0)) {
      // Reached an already-visited junction through a new passage: turn around.
      d = back
    } else {
      const usable = others.filter((o) => mark(o) < 2)
      if (usable.length === 0) {
        d = back !== -1 && mark(back) < 2 ? back : -1
      } else {
        const fewest = Math.min(...usable.map(mark))
        const choices = usable.filter((o) => mark(o) === fewest)
        d = choices[randomInt(rng, choices.length)]
      }
    }
    if (d === -1) break
    const next = move(maze, cell, d)
    marks[cell * 4 + d]++
    marks[next * 4 + ((d + 2) % 4)]++
    position = next
    back = (d + 2) % 4
    trace.push(position)
  }
  return walkResult(maze, trace)
}

/** Random mouse: pick a random passage, avoiding the one it came from unless it is a dead end. */
export const randomMouse: Explorer = (maze, rng) => {
  const limit = stepLimit(maze)
  const trace = [maze.start]
  let position = maze.start
  let back = -1
  while (position !== maze.exit && trace.length <= limit) {
    const cell = position
    const open = [0, 1, 2, 3].filter((d) => isOpen(maze, cell, d))
    const forward = open.filter((d) => d !== back)
    const options = forward.length > 0 ? forward : open
    if (options.length === 0) break
    const d = options[randomInt(rng, options.length)]
    position = move(maze, cell, d)
    back = (d + 2) % 4
    trace.push(position)
  }
  return walkResult(maze, trace)
}

/** Depth-first exploration done by walking: picks a random unvisited passage, walks back at dead ends. */
export const dfsExplorer: Explorer = (maze, rng) =>
  dfsWalk(maze, (candidates) => candidates[randomInt(rng, candidates.length)])
