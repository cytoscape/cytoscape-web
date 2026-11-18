/**
 * Shared-link selection restore waits for the view model to exist, however
 * long the network takes to load, and drops the restore when the user leaves
 * for another network first (#965).
 */
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import type { IdType } from '@/models/IdType'
import NetworkFn from '@/models/NetworkModel'
import ViewModelFn from '@/models/ViewModel'

import type { AppShellBootContext } from './appShellBootContext'
import { restoreUrlState } from './restoreUrlState'

vi.mock('@/data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/db')>()
  const mocked: Record<string, unknown> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

const MAIN_ID: IdType = 'restore-url-main'
const SUB_ID: IdType = `${MAIN_ID}_42`
const OTHER_ID: IdType = 'restore-url-other'

// Longer than the ~5 s the old polling waited before it gave up.
const SLOW_LOAD_MS = 8000

const contextFor = (query: string): AppShellBootContext =>
  ({ search: new URLSearchParams(query) }) as AppShellBootContext

const addView = (networkId: IdType): void => {
  const network = NetworkFn.createNetworkFromLists(
    networkId,
    [{ id: 'n1' }, { id: 'n2' }],
    [{ id: 'e1', s: 'n1', t: 'n2' }],
  )
  act(() => {
    useViewModelStore
      .getState()
      .add(networkId, ViewModelFn.createViewModel(network))
  })
}

const selectedNodesOf = (networkId: IdType): IdType[] | undefined =>
  useViewModelStore.getState().getViewModel(networkId)?.selectedNodes

describe('restoreUrlState selection restore (#965)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    act(() => {
      useViewModelStore.getState().deleteAll()
      useWorkspaceStore.getState().setCurrentNetworkId(MAIN_ID)
      useUiStateStore.getState().setActiveNetworkView('')
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('selects at once when the view is already loaded', () => {
    addView(MAIN_ID)

    restoreUrlState(contextFor('selectednodes=n1'), MAIN_ID)

    expect(selectedNodesOf(MAIN_ID)).toEqual(['n1'])
  })

  it('restores the main selection when the network loads slowly', () => {
    restoreUrlState(contextFor('selectednodes=n1'), MAIN_ID)

    act(() => {
      vi.advanceTimersByTime(SLOW_LOAD_MS)
    })
    addView(MAIN_ID)

    expect(selectedNodesOf(MAIN_ID)).toEqual(['n1'])
  })

  it('restores the active subnetwork and its selection when it loads slowly', () => {
    restoreUrlState(
      contextFor(`activeNetworkView=${SUB_ID}&selectedSubnetworkNodes=n2`),
      MAIN_ID,
    )

    act(() => {
      vi.advanceTimersByTime(SLOW_LOAD_MS)
    })
    addView(SUB_ID)

    expect(useUiStateStore.getState().ui.activeNetworkView).toBe(SUB_ID)
    expect(selectedNodesOf(SUB_ID)).toEqual(['n2'])
  })

  it('drops the restore when the user opens another network first', () => {
    restoreUrlState(
      contextFor(
        `selectednodes=n1&activeNetworkView=${SUB_ID}&selectedSubnetworkNodes=n2`,
      ),
      MAIN_ID,
    )

    act(() => {
      useWorkspaceStore.getState().setCurrentNetworkId(OTHER_ID)
    })
    addView(MAIN_ID)
    addView(SUB_ID)
    act(() => {
      vi.advanceTimersByTime(SLOW_LOAD_MS)
    })

    expect(selectedNodesOf(MAIN_ID)).toEqual([])
    expect(selectedNodesOf(SUB_ID)).toEqual([])
    expect(useUiStateStore.getState().ui.activeNetworkView).toBe(OTHER_ID)
  })
})
