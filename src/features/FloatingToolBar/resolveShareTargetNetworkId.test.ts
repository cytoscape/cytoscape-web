import { describe, expect, it } from 'vitest'

import { resolveShareTargetNetworkId } from './resolveShareTargetNetworkId'

const HIER = 'hier-1'
const SUB = 'hier-1_73'

describe('resolveShareTargetNetworkId (CW-654)', () => {
  it('uses the explicit target from the subnetwork (right) toolbar', () => {
    expect(
      resolveShareTargetNetworkId({
        targetNetworkId: SUB,
        activeNetworkView: HIER,
        currentNetworkId: HIER,
        shownSubNetworkId: '',
      }),
    ).toBe(SUB)
  })

  it('uses activeNetworkView when it points at an activated subnetwork', () => {
    expect(
      resolveShareTargetNetworkId({
        targetNetworkId: undefined,
        activeNetworkView: SUB,
        currentNetworkId: HIER,
        shownSubNetworkId: SUB,
      }),
    ).toBe(SUB)
  })

  it('falls back to the shown subnetwork on the hierarchy (left) toolbar (the CW-654 fix)', () => {
    // User selected a system but never clicked the subnetwork pane, so
    // activeNetworkView still equals the hierarchy.
    expect(
      resolveShareTargetNetworkId({
        targetNetworkId: undefined,
        activeNetworkView: HIER,
        currentNetworkId: HIER,
        shownSubNetworkId: SUB,
      }),
    ).toBe(SUB)
  })

  it('ignores a shown subnetwork that belongs to a different hierarchy', () => {
    expect(
      resolveShareTargetNetworkId({
        targetNetworkId: undefined,
        activeNetworkView: HIER,
        currentNetworkId: HIER,
        shownSubNetworkId: 'other-hierarchy_5',
      }),
    ).toBeUndefined()
  })

  it('returns undefined for a plain network with no subnetwork shown', () => {
    expect(
      resolveShareTargetNetworkId({
        targetNetworkId: undefined,
        activeNetworkView: '',
        currentNetworkId: 'net1',
        shownSubNetworkId: '',
      }),
    ).toBeUndefined()
  })
})
