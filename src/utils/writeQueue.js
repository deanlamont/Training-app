// In-memory write queue for cloud writes that should survive flaky signal
// during a workout. Each job runs to completion (with retries) before the
// next is attempted, preserving order. Failures after retry are surfaced
// via the failed counter so the UI can show a red banner.
//
// Why in-memory: iOS Safari private browsing — the user's primary device —
// wipes IndexedDB and localStorage on tab close, so durable persistence
// would only help non-private contexts. The realistic basement scenario
// is "logged a set, signal patchy, re-synced when bars came back" — that
// works fine in memory as long as the tab stays open.

const listeners = new Set()
const queue = []
let inFlight = 0
let failedCount = 0
let draining = false

function snapshot() {
  return {
    queued: queue.length,
    inFlight,
    failed: failedCount,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  }
}

function notify() {
  const s = snapshot()
  for (const l of listeners) l(s)
}

export function subscribe(fn) {
  listeners.add(fn)
  fn(snapshot())
  return () => listeners.delete(fn)
}

export function getStatus() {
  return snapshot()
}

/**
 * Enqueue a cloud write. `run` is an async function that performs the write
 * and throws on failure. `label` is for logging only. Returns a promise that
 * resolves once the job completes (or rejects after the final retry).
 */
export function enqueueWrite(label, run) {
  return new Promise((resolve, reject) => {
    queue.push({ label, run, attempts: 0, resolve, reject })
    notify()
    void drain()
  })
}

export function clearFailed() {
  failedCount = 0
  notify()
}

async function drain() {
  if (draining) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) { notify(); return }
  draining = true
  try {
    while (queue.length) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break
      const job = queue[0]
      inFlight = 1; notify()
      try {
        await job.run()
        queue.shift()
        job.resolve?.()
      } catch (e) {
        job.attempts++
        console.error(`[writeQueue] ${job.label} attempt ${job.attempts} failed:`, e)
        if (job.attempts >= 3) {
          failedCount++
          queue.shift()
          job.reject?.(e)
        } else {
          inFlight = 0; notify()
          await new Promise(r => setTimeout(r, 1000 * (2 ** (job.attempts - 1))))
          continue
        }
      }
      inFlight = 0; notify()
    }
  } finally {
    draining = false
    notify()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { notify(); void drain() })
  window.addEventListener('offline', notify)
}
