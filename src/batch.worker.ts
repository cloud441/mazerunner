import { runBatch, type BatchConfig, type BatchRow } from './core/batch'

export type WorkerMessage =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; rows: BatchRow[]; elapsedMs: number }
  | { type: 'error'; message: string }

const send = (message: WorkerMessage) => postMessage(message)

onmessage = (event: MessageEvent<BatchConfig>) => {
  try {
    const startedAt = performance.now()
    const rows = runBatch(event.data, (done, total) => send({ type: 'progress', done, total }))
    send({ type: 'done', rows, elapsedMs: performance.now() - startedAt })
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'Batch failed' })
  }
}
