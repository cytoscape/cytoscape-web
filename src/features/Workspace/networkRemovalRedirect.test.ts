// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { redirectAfterRemoval } from './networkRemovalRedirect'

describe('redirectAfterRemoval', () => {
  it('stays put while the URL names no network', () => {
    const workspace = { networkIds: ['a'], currentNetworkId: 'a' }
    expect(redirectAfterRemoval(undefined, workspace)).toBeUndefined()
    expect(redirectAfterRemoval('', workspace)).toBeUndefined()
  })

  it('stays put while the network the URL names is in the workspace', () => {
    expect(
      redirectAfterRemoval('a', {
        networkIds: ['a', 'b'],
        currentNetworkId: 'b',
      }),
    ).toBeUndefined()
  })

  it('follows the repaired current network', () => {
    expect(
      redirectAfterRemoval('a', {
        networkIds: ['b', 'c'],
        currentNetworkId: 'c',
      }),
    ).toBe('c')
  })

  it('goes to the network list once the workspace is empty', () => {
    expect(
      redirectAfterRemoval('a', { networkIds: [], currentNetworkId: '' }),
    ).toBe('')
  })

  it('falls back to the first network while the pointer still names a removed one', () => {
    expect(
      redirectAfterRemoval('a', {
        networkIds: ['b', 'c'],
        currentNetworkId: 'a',
      }),
    ).toBe('b')
    expect(
      redirectAfterRemoval('a', { networkIds: [], currentNetworkId: 'a' }),
    ).toBe('')
  })
})
