import { createNetworkDataObj } from './index'
import { SelectedDataScope } from '../../models/AppModel/SelectedDataScope'
import { Format, Model } from '../../models/AppModel/ServiceInputDefinition'
import { Network } from '../../models'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'

describe('ServiceApps', () => {
  describe('createNetworkDataObj', () => {
    const mockNetwork: Network = {
      id: 'net1',
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [
        { id: 'e1', s: 'n1', t: 'n2' },
        { id: 'e2', s: 'n2', t: 'n1' },
      ],
    }

    const mockTable: TableRecord = {
      nodeTable: { id: 'nt1', columns: [], rows: new Map() },
      edgeTable: {
        id: 'et1',
        columns: [{ name: 'interaction', type: 'string' }] as any,
        rows: new Map([
          ['e1', { interaction: 'pd' }],
          ['e2', { interaction: 'pp' }],
        ]),
      },
    }

    it('should return edgeList format correctly', () => {
      const scope = SelectedDataScope.all
      const inputNetwork = { format: Format.edgeList, model: Model.network }
      
      const result = createNetworkDataObj(
        scope,
        inputNetwork,
        mockNetwork,
        undefined,
        undefined,
        mockTable,
        undefined,
        undefined,
        undefined
      )

      expect(result).toEqual({
        columns: [
          { id: 'source', type: 'string' },
          { id: 'target', type: 'string' },
          { id: 'interaction', type: 'string' }
        ],
        rows: {
          'e1': { source: 'n1', target: 'n2', interaction: 'pd' },
          'e2': { source: 'n2', target: 'n1', interaction: 'pp' }
        }
      })
    })

    it('should filter edges in edgeList format based on selection', () => {
      const scope = SelectedDataScope.dynamic
      const inputNetwork = { format: Format.edgeList, model: Model.network }
      const viewModel = {
        id: 'view1',
        networkId: 'net1',
        selectedNodes: [],
        selectedEdges: ['e1'],
        nodeViews: {},
        edgeViews: {},
      }
      
      const result = createNetworkDataObj(
        scope,
        inputNetwork,
        mockNetwork,
        undefined,
        undefined,
        mockTable,
        undefined,
        viewModel as any,
        undefined
      )

      expect(result).toEqual({
        columns: [
          { id: 'source', type: 'string' },
          { id: 'target', type: 'string' },
          { id: 'interaction', type: 'string' }
        ],
        rows: {
          'e1': { source: 'n1', target: 'n2', interaction: 'pd' }
        }
      })
    })

    it('should handle missing interaction attribute gracefully', () => {
      const scope = SelectedDataScope.all
      const inputNetwork = { format: Format.edgeList, model: Model.network }
      const tableWithMissingInteraction: TableRecord = {
        ...mockTable,
        edgeTable: {
          ...mockTable.edgeTable,
          rows: new Map([['e1', {}]])
        }
      }
      
      const result = createNetworkDataObj(
        scope,
        inputNetwork,
        mockNetwork,
        undefined,
        undefined,
        tableWithMissingInteraction,
        undefined,
        undefined,
        undefined
      )

      expect((result as any).rows['e1']).toEqual({ source: 'n1', target: 'n2' })
    })
  })
})
