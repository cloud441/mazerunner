export type Rng = () => number

/** mulberry32: small, fast, seedable PRNG returning floats in [0, 1). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const randomInt = (rng: Rng, max: number) => Math.floor(rng() * max)

export const randomSeed = () => Math.floor(Math.random() * 2 ** 32)

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
