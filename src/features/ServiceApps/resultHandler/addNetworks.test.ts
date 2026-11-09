import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { validateCX2 } from '../../../models/CxModel/impl/validator'
import { MessageSeverity } from '../../../models/MessageModel'
import { useAddNetworks } from './addNetworks'

vi.mock('../../../data/hooks/navigation/useUrlNavigation', () => ({
  useUrlNavigation: () => ({ navigateToNetwork: vi.fn() }),
}))

// A valid CX2 document whose merged column would receive a value of another
// declared type
const conflictingCx = [
  { CXVersion: '2.0', hasFragments: false },
  {
    metaData: [
      { name: 'attributeDeclarations', elementCount: 1 },
      { name: 'nodes', elementCount: 1 },
    ],
  },
  {
    attributeDeclarations: [
      { nodes: { score: { d: 'string' }, Score: { d: 'integer' } } },
    ],
  },
  { nodes: [{ id: 1, x: 0, y: 0, v: { Score: 5 } }] },
  { status: [{ error: '', success: true }] },
]

describe('useAddNetworks column type conflict (#951)', () => {
  beforeEach(() => {
    useMessageStore.setState({ messages: [] })
  })

  it('uses a document the validator accepts', () => {
    expect(validateCX2(conflictingCx).isValid).toBe(true)
  })

  it('tells the user why the network was not added and adds nothing', async () => {
    const before = useNetworkStore.getState().networks.size
    const { result } = renderHook(() => useAddNetworks())

    await act(async () => {
      await result.current({
        responseObj: [conflictingCx] as any,
        networkId: 'unused',
      })
    })

    const [message] = useMessageStore.getState().messages
    expect(message.severity).toBe(MessageSeverity.ERROR)
    expect(message.message).toMatch(/"Score".*"score"/)
    expect(useNetworkStore.getState().networks.size).toBe(before)
  })
})
