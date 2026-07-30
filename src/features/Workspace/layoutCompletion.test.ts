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
 * `updateNodePositions` flips `networkModified` to true, mirroring
 * WorkspaceEditor's view model subscription, which reacts synchronously to any
 * non-selection view model change — including the layout's own position write.
 */
const createFakeState = (
  initiallyModified: boolean,
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
      // The view model subscription marks the network as modified.
      modified = true
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
