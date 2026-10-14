// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  resolveShownSubNetworkId,
  resolveSubNetworkPanelView,
} from './resolveShownSubNetworkId'

const SUB_A = 'hier-1_7'
const SUB_B = 'hier-1_42'

describe('resolveShownSubNetworkId (#758)', () => {
  it('returns the rendered subnetwork once it matches the fetched data', () => {
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_B,
        fetchedNetworkId: SUB_B,
        hasError: false,
        isLoading: false,
        hasViewModel: true,
      }),
    ).toBe(SUB_B)
  })

  it('returns nothing while a newly selected subsystem is loading', () => {
    // The query key changed, so there is no data yet, but the previous
    // subnetwork is still the one in local state.
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_A,
        fetchedNetworkId: undefined,
        hasError: false,
        isLoading: false,
        hasViewModel: true,
      }),
    ).toBe('')
  })

  it('returns nothing while fetched data is still being registered', () => {
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_A,
        fetchedNetworkId: SUB_B,
        hasError: false,
        isLoading: false,
        hasViewModel: true,
      }),
    ).toBe('')
  })

  it('returns nothing when the fetch failed', () => {
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_A,
        fetchedNetworkId: undefined,
        hasError: true,
        isLoading: false,
        hasViewModel: true,
      }),
    ).toBe('')
    // A failed refetch of the same subsystem keeps its previous data
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_B,
        fetchedNetworkId: SUB_B,
        hasError: true,
        isLoading: false,
        hasViewModel: true,
      }),
    ).toBe('')
  })

  it('returns nothing while the panel still shows progress', () => {
    // updateNetworkView() sets queryNetworkId before processing ends, and a
    // background refetch keeps the previous data while fetching.
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_B,
        fetchedNetworkId: SUB_B,
        hasError: false,
        isLoading: true,
        hasViewModel: true,
      }),
    ).toBe('')
  })

  it('returns nothing before the subnetwork has a view model', () => {
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_B,
        fetchedNetworkId: SUB_B,
        hasError: false,
        isLoading: false,
        hasViewModel: false,
      }),
    ).toBe('')
  })

  it('returns nothing when no subnetwork has been shown yet', () => {
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: '',
        fetchedNetworkId: undefined,
        hasError: false,
        isLoading: false,
        hasViewModel: false,
      }),
    ).toBe('')
  })
})

describe('resolveSubNetworkPanelView', () => {
  const idle = {
    isFetching: false,
    isProcessing: false,
    hasError: false,
    renderFailed: false,
    shownSubNetworkId: SUB_B,
  }

  it('renders the subnetwork once it is the one shown', () => {
    expect(resolveSubNetworkPanelView(idle)).toBe('network')
  })

  it('shows progress while fetched data is being rendered', () => {
    expect(resolveSubNetworkPanelView({ ...idle, isProcessing: true })).toBe(
      'processing',
    )
  })

  it('shows loading while fetching', () => {
    expect(resolveSubNetworkPanelView({ ...idle, isFetching: true })).toBe(
      'loading',
    )
  })

  // Offline, the query is paused: not fetching, no error, no data. The
  // previous subnetwork must not be rendered under the new subsystem's title.
  it('shows loading, not the previous subnetwork, when nothing is shown', () => {
    expect(resolveSubNetworkPanelView({ ...idle, shownSubNetworkId: '' })).toBe(
      'loading',
    )
  })

  it('shows the fetch error', () => {
    expect(
      resolveSubNetworkPanelView({
        ...idle,
        hasError: true,
        shownSubNetworkId: '',
      }),
    ).toBe('error')
  })

  it('reports a failed render instead of loading forever', () => {
    expect(
      resolveSubNetworkPanelView({
        ...idle,
        renderFailed: true,
        shownSubNetworkId: '',
      }),
    ).toBe('renderFailed')
  })
})
