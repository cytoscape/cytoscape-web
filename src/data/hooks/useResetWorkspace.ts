import debounce from 'lodash/debounce'
import { useCallback, useState } from 'react'
import { useHref, useNavigate } from 'react-router-dom'

import { logDb } from '@/debug'
import { useWorkspaceStore } from './stores/WorkspaceStore'

/**
 * What the caller has to tell the user after a reset attempt.
 *
 * `succeeded` and `reloading` need no message — the app is already navigating.
 * Only `failed` leaves the user where they were with nothing having happened,
 * so it carries the reason.
 */
export type ResetWorkspaceResult =
  /** Workspace cleared; a debounced navigation to `/` is already scheduled. */
  | { status: 'succeeded' }
  /** No usable database connection remains; a full page load is under way. */
  | { status: 'reloading'; reason: string }
  /** Nothing was changed. The data is intact. */
  | { status: 'failed'; reason: string }

/**
 * Run "Reset Local Workspace" and drive the navigation it implies.
 *
 * Shared by the two doors onto this operation — the error page's button
 * (`features/Error.tsx`) and the Data menu item
 * (`features/ToolBar/DataMenu`). They had the same three-way branch on
 * `resetWorkspace`'s outcome copied into each, so a new outcome value would have
 * had to be handled twice.
 *
 * Presentation stays with the caller: Error.tsx renders an inline Alert, the
 * menu uses `alert()`. The hook only decides what happened and where to go.
 *
 * Never rejects. A throw from the store becomes `failed`, because a dead button
 * is the one outcome this operation cannot afford.
 */
export const useResetWorkspace = (): {
  reset: () => Promise<ResetWorkspaceResult>
  isResetting: boolean
} => {
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)
  const navigate = useNavigate()
  // Respects a base path (`/cytoscape/`), which a bare '/' would discard.
  const rootHref = useHref('/')
  const [isResetting, setIsResetting] = useState(false)

  const reset = useCallback(async (): Promise<ResetWorkspaceResult> => {
    setIsResetting(true)
    try {
      const outcome = await resetWorkspace()

      if (outcome.status === 'failed') {
        setIsResetting(false)
        return { status: 'failed', reason: outcome.reason }
      }

      if (outcome.status === 'reload-required') {
        // The stores still hold the old workspace and there is no usable
        // database connection, so reload immediately rather than debouncing:
        // anything they write next would land in the fresh database.
        window.location.assign(rootHref)
        return { status: 'reloading', reason: outcome.reason }
      }

      // Debounced so the store writes settle before the route changes.
      debounce(() => {
        navigate('/')
        navigate(0)
      }, 1500)()
      return { status: 'succeeded' }
    } catch (e) {
      logDb.error('[useResetWorkspace] Workspace reset threw', e)
      setIsResetting(false)
      return {
        status: 'failed',
        reason: 'The reset failed unexpectedly. Please try again.',
      }
    }
  }, [navigate, resetWorkspace, rootHref])

  return { reset, isResetting }
}
