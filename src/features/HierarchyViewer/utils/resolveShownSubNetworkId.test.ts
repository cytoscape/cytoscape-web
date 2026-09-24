// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { resolveShownSubNetworkId } from './resolveShownSubNetworkId'

const SUB_A = 'hier-1_7'
const SUB_B = 'hier-1_42'

describe('resolveShownSubNetworkId (#758)', () => {
  it('returns the rendered subnetwork once it matches the fetched data', () => {
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_B,
        fetchedNetworkId: SUB_B,
        hasError: false,
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
        hasViewModel: true,
      }),
    ).toBe('')
    // A failed refetch of the same subsystem keeps its previous data
    expect(
      resolveShownSubNetworkId({
        queryNetworkId: SUB_B,
        fetchedNetworkId: SUB_B,
        hasError: true,
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
        hasViewModel: false,
      }),
    ).toBe('')
  })
})
