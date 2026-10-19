const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

export const fmt = (n: number) => integer.format(n)
export const dec = (n: number) => decimal.format(n)
export const pct = (ratio: number) => `${(ratio * 100).toFixed(1)}%`
