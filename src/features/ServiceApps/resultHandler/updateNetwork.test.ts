import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { validateCX2 } from '../../../models/CxModel/impl/validator'
import { MessageSeverity } from '../../../models/MessageModel'
import { useUpdateNetwork } from './updateNetwork'

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

const networkId = 'net-update'
const existingView = {
  id: networkId,
  type: 'nodeLink',
  viewId: `${networkId}-nodeLink-1`,
  values: new Map(),
  nodeViews: {},
  edgeViews: {},
  selectedNodes: ['1'],
  selectedEdges: [],
}

describe('useUpdateNetwork column type conflict (#951)', () => {
  beforeEach(() => {
    useMessageStore.setState({ messages: [] })
    useViewModelStore.setState({
      viewModels: { [networkId]: [existingView as any] },
    })
  })

  it('uses a document the validator accepts', () => {
    expect(validateCX2(conflictingCx).isValid).toBe(true)
  })

  it('leaves the existing view and its selection in place', async () => {
    const { result } = renderHook(() => useUpdateNetwork())

    await act(async () => {
      await result.current({ responseObj: conflictingCx as any, networkId })
    })

    expect(useViewModelStore.getState().viewModels[networkId]).toHaveLength(1)
    expect(
      useViewModelStore.getState().viewModels[networkId][0].selectedNodes,
    ).toEqual(['1'])
  })

  it('tells the user why the network was not updated', async () => {
    const { result } = renderHook(() => useUpdateNetwork())

    await act(async () => {
      await result.current({ responseObj: conflictingCx as any, networkId })
    })

    const [message] = useMessageStore.getState().messages
    expect(message.severity).toBe(MessageSeverity.ERROR)
    expect(message.message).toMatch(/"Score".*"score"/)
  })
})
