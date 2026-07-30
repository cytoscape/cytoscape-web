import { BootPhase } from './bootPhases'
import type { BootShellError } from './shell/bootShellMarkup'

// Turns whatever a phase threw into something a person can act on.
//
// Phase-specific classifiers register here rather than the runner growing a
// switch: the DB gate knows how to recognize a VersionError, and nothing else
// should have to.

export interface BootError extends BootShellError {
  phase: BootPhase
  cause: unknown
}

export type BootErrorClassifier = (cause: unknown) => BootShellError | undefined

const classifiers = new Map<BootPhase, BootErrorClassifier>()

/**
 * Registers a classifier for a phase. It may return undefined to fall through
 * to the generic message, so a classifier only has to handle what it knows.
 */
export const registerBootErrorClassifier = (
  phase: BootPhase,
  classifier: BootErrorClassifier,
): void => {
  classifiers.set(phase, classifier)
}

export const errorMessageOf = (cause: unknown): string =>
  cause instanceof Error
    ? cause.message
    : typeof cause === 'string'
      ? cause
      : String(cause)

// Keyed by BootPhase rather than string so adding a phase without a title is a
// compile error instead of a silent fall through to the generic message.
const GENERIC_TITLE: Record<BootPhase, string> = {
  [BootPhase.RUNTIME]: 'Cytoscape Web could not start',
  [BootPhase.DATABASE]: 'Local storage is unavailable',
  [BootPhase.AUTH]: 'Sign-in check failed',
  [BootPhase.WORKSPACE]: 'Your workspace could not be loaded',
  [BootPhase.DEEP_LINK]: 'That network could not be opened',
  [BootPhase.IMPORTS]: 'A network could not be imported',
  [BootPhase.PUBLISH]: 'Your workspace could not be opened',
  [BootPhase.INTENTS]: 'An app could not be added',
  [BootPhase.ROUTE]: 'Navigation failed',
}

export const classifyBootError = (
  phase: BootPhase,
  cause: unknown,
): BootError => {
  const classified = classifiers.get(phase)?.(cause)

  return {
    phase,
    cause,
    title: classified?.title ?? GENERIC_TITLE[phase],
    message:
      classified?.message ??
      'Something went wrong while starting up. Reloading the page may help.',
    detail: classified?.detail ?? errorMessageOf(cause),
    // No generic fallback: an action has to be declared by the classifier that
    // knows a recovery exists. There is nothing safe to offer by default.
    action: classified?.action,
  }
}

export const resetBootErrorClassifiersForTesting = (): void => {
  classifiers.clear()
}
