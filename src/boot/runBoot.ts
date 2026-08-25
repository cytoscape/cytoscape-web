import { logStartup } from '../debug'
import { classifyBootError, type BootError } from './bootError'
import { BOOT_PHASE_MESSAGE, BootPhase, FATAL_BOOT_PHASES } from './bootPhases'
import { setBootError, setBootMessage } from './bootState'
import { bootNow, measureBoot } from './metrics/bootMarks'

// The boot phase runner.
//
// Every phase goes through here, and it does the four things that were
// previously either forgotten or hand-written per call site: set the shell
// message, time the phase, catch and classify failures, and decide whether the
// boot can continue.
//
// runPhase RETURNS a result rather than throwing. That is the whole point: a
// caller physically cannot let a phase rejection escape and abort the phases
// after it, which is the failure mode that used to strand startup with the
// URL un-cleaned and the workspace never published.

export type PhaseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: BootError }

let aborted = false

/** True once a fatal phase has failed; remaining phases should not run. */
export const isBootAborted = (): boolean => aborted

export const runPhase = async <T>(
  phase: BootPhase,
  fn: () => Promise<T> | T,
): Promise<PhaseResult<T>> => {
  const message = BOOT_PHASE_MESSAGE[phase]
  if (message !== undefined) {
    setBootMessage(message)
  }

  const start = bootNow()

  try {
    const value = await fn()
    measureBoot(phase, start)
    return { ok: true, value }
  } catch (cause) {
    measureBoot(phase, start, bootNow(), 'error')

    const error = classifyBootError(phase, cause)
    logStartup.error(`[boot]: phase "${phase}" failed: ${error.detail}`, cause)

    if (FATAL_BOOT_PHASES.has(phase)) {
      aborted = true
      setBootError(error)
    }

    return { ok: false, error }
  }
}

/**
 * Runs a phase only if the boot is still viable, so a fatal failure short-
 * circuits everything after it without each call site testing for it.
 */
export const runPhaseUnlessAborted = async <T>(
  phase: BootPhase,
  fn: () => Promise<T> | T,
): Promise<PhaseResult<T> | undefined> =>
  aborted ? undefined : await runPhase(phase, fn)

/** Convenience for phases whose value is optional to the caller. */
export const valueOr = <T>(result: PhaseResult<T>, fallback: T): T =>
  result.ok ? result.value : fallback

export const resetBootRunnerForTesting = (): void => {
  aborted = false
}
