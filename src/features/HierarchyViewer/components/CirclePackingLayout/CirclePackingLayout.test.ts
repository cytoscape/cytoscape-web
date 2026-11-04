// @vitest-environment node
import cytoscape from 'cytoscape'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchNodeNamesByIds } from '../../../../data/external-api/ndex'
import { Network } from '../../../../models/NetworkModel'
import { Table } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'
import { createTreeLayout } from './CirclePackingLayout'

vi.mock('../../../../data/external-api/ndex', () => ({
  fetchNodeNamesByIds: vi.fn(),
}))

const network = {
  id: 'hierarchy',
  store: cytoscape({ headless: true, elements: [{ data: { id: 'root' } }] }),
} as unknown as Network

const build = (row: Record<string, unknown>) =>
  createTreeLayout({
    network,
    nodeTable: {
      rows: new Map([['root', { name: 'Root', ...row }]]),
    } as unknown as Table,
    interactionNetworkId: 'interaction-uuid',
    interactionNetworkHostUrl: 'https://ndex.example',
    getToken: async () => 'token',
  })

const ringNames = (root: Awaited<ReturnType<typeof build>>): string[] =>
  (root.children ?? []).map((child) => child.data.name).sort()

describe('createTreeLayout member names', () => {
  beforeEach(() => {
    vi.mocked(fetchNodeNamesByIds).mockReset()
    vi.mocked(fetchNodeNamesByIds).mockResolvedValue(
      new Map([
        ['0', 'ACTB'],
        ['189', 'SMARCD2'],
      ]),
    )
  })

  it('looks HCX::members up in the interaction network', async () => {
    const root = await build({ [SubsystemTag.members]: [0, 189] })

    expect(fetchNodeNamesByIds).toHaveBeenCalledWith(
      'interaction-uuid',
      [0, 189],
      'token',
      'https://ndex.example',
    )
    expect(ringNames(root)).toEqual(['ACTB', 'SMARCD2'])
  })

  it('shows HCX::memberNames as they are, even when they look like ids', async () => {
    const root = await build({ [SubsystemTag.memberNames]: ['189', '7'] })

    expect(fetchNodeNamesByIds).not.toHaveBeenCalled()
    expect(ringNames(root)).toEqual(['189', '7'])
  })
})
