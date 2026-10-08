// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { IdType } from '../../models/IdType'
import {
  createLayoutCompletionHandler,
  LayoutCompletionActions,
} from './layoutCompletion'

const NETWORK_ID: IdType = 'network-1'

const POSITIONS = new Map<IdType, [number, number]>([
  ['node-1', [10, 20]],
  ['node-2', [30, 40]],
])

/**
 * Test double for the slice of app state the handler touches.
 *
 * `updateNodePositions` flips `networkModified` to true. That mirrored
 * WorkspaceEditor's view model subscription, which reacted synchronously to
 * any non-selection view model change — including the layout's own position
 * write. The subscription is gone (#680) and the initial layout posts no edit,
 * so the flip no longer happens in the app; the double keeps it because it is
 * the adversarial case for the snapshot-before-write ordering, and the
 * ordering is what these tests pin. `marksNothing` covers the current
 * behavior.
 */
const createFakeState = (
  initiallyModified: boolean,
  /** When true, updateNodePositions leaves the flag alone (post-#680). */
  marksNothing = false,
): {
  actions: LayoutCompletionActions
  calls: string[]
  isModified: () => boolean
} => {
  const calls: string[] = []
  let modified = initiallyModified

  const actions: LayoutCompletionActions = {
    isNetworkModified: () => {
      calls.push('isNetworkModified')
      return modified
    },
    updateNodePositions: () => {
      calls.push('updateNodePositions')
      if (!marksNothing) {
        // What the deleted view model subscription did (#680).
        modified = true
      }
    },
    fitViewport: () => {
      calls.push('fitViewport')
    },
    markLayoutApplied: () => {
      calls.push('markLayoutApplied')
    },
    setLayoutRunning: (isRunning) => {
      calls.push(`setLayoutRunning:${isRunning}`)
    },
    setNetworkModified: (_id, isModified) => {
      calls.push(`setNetworkModified:${isModified}`)
      modified = isModified
    },
  }

  return { actions, calls, isModified: () => modified }
}

describe('createLayoutCompletionHandler', () => {
  it('leaves a network unmodified when only the initial layout ran', () => {
    // Regression: reading networkModified after updateNodePositions observes the
    // layout's own view model write, so the flag would never be cleared and a
    // freshly loaded network would show unsaved changes it does not have.
    const { actions, calls, isModified } = createFakeState(false)

    createLayoutCompletionHandler(NETWORK_ID, actions)(POSITIONS)

    expect(calls).toContain('setNetworkModified:false')
    expect(isModified()).toBe(false)
  })

  it('preserves the modified flag when the user edited during the layout run', () => {
    // Regression: the completion callback used to clear the flag
    // unconditionally, hiding the unsaved-changes indicator for real edits.
    const { actions, calls, isModified } = createFakeState(true)

    createLayoutCompletionHandler(NETWORK_ID, actions)(POSITIONS)

    expect(calls).not.toContain('setNetworkModified:false')
    expect(isModified()).toBe(true)
  })

  it('snapshots the modified flag before writing layout positions', () => {
    const { actions, calls } = createFakeState(false)

    createLayoutCompletionHandler(NETWORK_ID, actions)(POSITIONS)

    expect(calls.indexOf('isNetworkModified')).toBeLessThan(
      calls.indexOf('updateNodePositions'),
    )
  })

  it('applies positions, fits the viewport, then finishes the layout run', () => {
    const { actions, calls } = createFakeState(false)

    createLayoutCompletionHandler(NETWORK_ID, actions)(POSITIONS)

    expect(calls).toEqual([
      'isNetworkModified',
      'updateNodePositions',
      'fitViewport',
      'markLayoutApplied',
      'setLayoutRunning:false',
      'setNetworkModified:false',
    ])
  })

  it('still clears the flag when the position write marks nothing (#680)', () => {
    // Current behavior: markNetworkModified is only called from postEdit, and
    // the initial layout posts no edit, so the flag is already false here.
    // The clear must remain a no-op rather than becoming a spurious write.
    const { actions, calls, isModified } = createFakeState(false, true)

    createLayoutCompletionHandler(NETWORK_ID, actions)(POSITIONS)

    expect(calls).toContain('setNetworkModified:false')
    expect(isModified()).toBe(false)
  })

  it('preserves a user edit made during a layout that marks nothing (#680)', () => {
    const { actions, calls, isModified } = createFakeState(true, true)

    createLayoutCompletionHandler(NETWORK_ID, actions)(POSITIONS)

    expect(calls).not.toContain('setNetworkModified:false')
    expect(isModified()).toBe(true)
  })

  it('passes the network id and layout positions through to the store actions', () => {
    const { actions } = createFakeState(false)
    const updateNodePositions = vi.fn()
    const setNetworkModified = vi.fn()

    createLayoutCompletionHandler(NETWORK_ID, {
      ...actions,
      updateNodePositions,
      setNetworkModified,
    })(POSITIONS)

    expect(updateNodePositions).toHaveBeenCalledWith(NETWORK_ID, POSITIONS)
    expect(setNetworkModified).toHaveBeenCalledWith(NETWORK_ID, false)
  })
})
