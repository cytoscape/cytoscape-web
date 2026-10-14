/**
 * Durable "the workspace is hydrated" flag.
 *
 * `publishWorkspace` announces hydration by dispatching `cywebapi:ready`, which
 * is the right shape for external consumers (extensions, LLM agents) but useless
 * to a component that mounts afterwards: the event has already fired and there is
 * nothing left to observe. `OnboardingHost` used to paper over that with an 8s
 * fallback timer, which cannot tell "the event already fired" from "the boot
 * died" — so it surfaced the welcome dialog over boot-error screens.
 *
 * This is the missing durable half of that signal: set immediately before the
 * event is dispatched, so a late mounter can read what it missed.
 *
 * Deliberately a plain flag rather than an observable — a consumer that needs the
 * transition still has the event; this only answers "did it already happen?".
 * Kept out of `bootState.ts` because that module is imported by the pre-React
 * boot shell chunk and must stay minimal.
 */

let workspaceHydrated = false

/** True once `publishWorkspace` has pushed the workspace into the stores. */
export const isWorkspaceHydrated = (): boolean => workspaceHydrated

export const markWorkspaceHydrated = (): void => {
  workspaceHydrated = true
}

/** Test-only: return to the pre-hydration state. */
export const resetWorkspaceHydratedForTesting = (): void => {
  workspaceHydrated = false
}
