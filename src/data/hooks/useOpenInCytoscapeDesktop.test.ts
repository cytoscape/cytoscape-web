import { CyNDEx } from '@js4cytoscape/ndex-client'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CYTOSCAPE_DESKTOP_UNAVAILABLE_MESSAGE } from '../../models/CxModel/impl/desktopRequirement'
import { MessageSeverity } from '../../models/MessageModel'
import { Network } from '../../models/NetworkModel'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { NetworkView } from '../../models/ViewModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { useOpenNetworkInCytoscape } from './useOpenInCytoscapeDesktop'

const addMessage = vi.fn()

vi.mock('./stores/MessageStore', () => ({
  useMessageStore: (selector: (state: unknown) => unknown) =>
    selector({ addMessage }),
}))

vi.mock('./stores/VisualStyleStore', () => ({
  getVisualStyleSetSnapshot: () => undefined,
  useVisualStyleStore: vi.fn(),
}))

vi.mock('../../models/CxModel/impl', () => ({
  exportCyNetworkToCx2: () => [],
}))

const network = { id: 'n1', nodes: [], edges: [] } as unknown as Network
const table = { nodeTable: {}, edgeTable: {} } as unknown as TableRecord
const viewModel = {} as NetworkView

describe('useOpenNetworkInCytoscape', () => {
  beforeEach(() => {
    addMessage.mockReset()
  })

  it('reports the shared Cytoscape Desktop requirement when the import fails (#844)', async () => {
    const cyndex = {
      postCX2NetworkToCytoscape: vi
        .fn()
        .mockRejectedValue(new Error('connection refused')),
    } as unknown as CyNDEx

    const { result } = renderHook(() => useOpenNetworkInCytoscape())

    await act(async () => {
      await result.current(
        network,
        {} as VisualStyle,
        undefined,
        table,
        {} as VisualStyleOptions,
        viewModel,
        undefined,
        cyndex,
        'My network',
      )
    })

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: MessageSeverity.ERROR,
        message: expect.stringContaining(CYTOSCAPE_DESKTOP_UNAVAILABLE_MESSAGE),
      }),
    )
  })
})
