/**
 * A type to represent the state of the search component.
 * These states represents the following:
 *
 *  - search function is ready
 *  - search is in progress
 *  - search is done
 *  - search is failed
 */

export const SearchState = {
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const

export type SearchState = (typeof SearchState)[keyof typeof SearchState]
