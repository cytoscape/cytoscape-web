// src/app-api/core/ready.ts
// Framework-agnostic readiness signal for the app API.
//
// External consumers previously had to listen for the one-shot
// `cywebapi:ready` window event and remember whether it had already
// fired. This wraps that handshake in an idempotent, promise-based signal
// so `await CyWebApi.whenReady()` works regardless of when it is called.

let ready = false
const waiters: Array<() => void> = []

/**
 * Mark the app API ready and resolve any pending `whenReady()` promises.
 * Idempotent — safe to call more than once. Called from AppShell after
 * stores hydrate and the event bus is initialized.
 */
export function markReady(): void {
  if (ready) return
  ready = true
  const pending = waiters.splice(0, waiters.length)
  for (const resolve of pending) resolve()
}

/** True once the app API and event bus are initialized. */
export function isReady(): boolean {
  return ready
}

/**
 * Resolves when the app API is ready (immediately if it already is).
 * The value is intentionally `void`; the caller already holds the API
 * object it wants to use.
 */
export function whenReadySignal(): Promise<void> {
  if (ready) return Promise.resolve()
  return new Promise<void>((resolve) => {
    waiters.push(resolve)
  })
}

// Fallback: if AppShell (or a non-standard host) signals readiness only
// via the window event, still resolve. Installed once at module load;
// guarded for non-DOM (test/SSR) environments. `markReady` is idempotent,
// so this composes safely with the explicit call.
if (
  typeof window !== 'undefined' &&
  typeof window.addEventListener === 'function'
) {
  window.addEventListener('cywebapi:ready', markReady, { once: true })
}
