// User Timing instrumentation for the boot path.
//
// Everything here writes real `performance.mark` / `performance.measure`
// entries, so the boot shows up in the DevTools Performance panel's User
// Timing track with no extra tooling — and keeps a parallel in-memory copy so
// bootReport can render it without re-querying the buffer (which browsers are
// free to evict).
//
// Deliberately dependency-free: this is imported by the pre-React shell chunk.

export const BOOT_MARK_PREFIX = 'cyweb.boot.'

/**
 * Point-in-time boot milestones, in the order they are expected to occur.
 * These are named for what actually happened, not for what the user infers
 * from it — `workspace-editor-mounted` means the editor is on screen, which
 * is not the same as the network canvas having finished drawing.
 */
export const BOOT_MILESTONES = [
  'shell-painted',
  'init-exec',
  'react-render',
  'auth-settled',
  'app-shell-mounted',
  'workspace-hydrated',
  'workspace-editor-mounted',
] as const

export type BootMilestone = (typeof BOOT_MILESTONES)[number]

export interface BootMilestoneRecord {
  name: BootMilestone
  /** Milliseconds since performance.timeOrigin (i.e. since navigation). */
  time: number
}

export interface BootSpanRecord {
  name: string
  startTime: number
  duration: number
  status: 'ok' | 'error'
}

const milestones: BootMilestoneRecord[] = []
const spans: BootSpanRecord[] = []

const hasPerformance = (): boolean =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'

export const bootNow = (): number => (hasPerformance() ? performance.now() : 0)

/**
 * Records a boot milestone. First write wins: React StrictMode invokes effects
 * twice in development, and the second pass must not overwrite the real time.
 */
export const markBoot = (name: BootMilestone): void => {
  if (!hasPerformance() || milestones.some((m) => m.name === name)) {
    return
  }

  const time = performance.now()
  milestones.push({ name, time })

  try {
    performance.mark(`${BOOT_MARK_PREFIX}${name}`)
  } catch {
    // User Timing is best-effort; never let it break the boot.
  }
}

/** Records a completed span, emitting a matching `performance.measure`. */
export const measureBoot = (
  name: string,
  startTime: number,
  endTime: number = bootNow(),
  status: BootSpanRecord['status'] = 'ok',
): void => {
  if (!hasPerformance()) {
    return
  }

  spans.push({ name, startTime, duration: endTime - startTime, status })

  try {
    performance.measure(`${BOOT_MARK_PREFIX}${name}`, {
      start: startTime,
      end: endTime,
    })
  } catch {
    // Older engines reject the options-object form of measure().
  }
}

export const getBootMilestones = (): BootMilestoneRecord[] => [...milestones]

export const getBootSpans = (): BootSpanRecord[] => [...spans]

export const resetBootMetricsForTesting = (): void => {
  milestones.length = 0
  spans.length = 0
}
