import { getBaseSummary } from './NetworkSummaryImpl'
import { Network } from '../../NetworkModel'
import NetworkFn from '../../NetworkModel'
import { Visibility } from '../Visibility'

// to run these: npx jest src/models/NetworkSummaryModel/impl/NetworkSummaryImpl.test.ts

describe('NetworkSummaryImpl', () => {
  describe('getBaseSummary', () => {
    it('should create a base network summary with minimal properties', () => {
      const network: Network = NetworkFn.createNetwork('test-network-1')

      const summary = getBaseSummary({
        name: 'Test Network',
        network,
      })

      expect(summary.name).toBe('Test Network')
      expect(summary.externalId).toBe('test-network-1')
      expect(summary.nodeCount).toBe(0)
      expect(summary.edgeCount).toBe(0)
      expect(summary.version).toBe('1.0.0')
      expect(summary.visibility).toBe(Visibility.PUBLIC)
      expect(summary.isNdex).toBe(false)
      expect(summary.isReadOnly).toBe(false)
      expect(summary.completed).toBe(false)
      expect(summary.description).toBe('Created by Cytoscape Web.')
    })

    it('should create a summary with description', () => {
      const network: Network = NetworkFn.createNetwork('test-network-2')

      const summary = getBaseSummary({
        name: 'Test Network',
        network,
        description: 'A custom description',
      })

      expect(summary.name).toBe('Test Network')
      expect(summary.description).toBe('A custom description')
    })

    it('should set node and edge counts from network', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-3',
        [{ id: '1' }, { id: '2' }, { id: '3' }],
        [
          { id: 'e1', s: '1', t: '2' },
          { id: 'e2', s: '2', t: '3' },
        ],
      )

      const summary = getBaseSummary({
        name: 'Test Network',
        network,
      })

      expect(summary.nodeCount).toBe(3)
      expect(summary.edgeCount).toBe(2)
    })

    it('should set default values for all required fields', () => {
      const network: Network = NetworkFn.createNetwork('test-network-4')

      const summary = getBaseSummary({
        name: 'Test Network',
        network,
      })

      expect(summary.isNdex).toBe(false)
      expect(summary.ownerUUID).toBe('')
      expect(summary.isReadOnly).toBe(false)
      expect(summary.subnetworkIds).toEqual([])
      expect(summary.isValid).toBe(false)
      expect(summary.warnings).toEqual([])
      expect(summary.isShowcase).toBe(false)
      expect(summary.isCertified).toBe(false)
      expect(summary.indexLevel).toBe('')
      expect(summary.hasLayout).toBe(false)
      expect(summary.hasSample).toBe(false)
      expect(summary.cxFileSize).toBe(0)
      expect(summary.cx2FileSize).toBe(0)
      expect(summary.properties).toEqual([])
      expect(summary.owner).toBe('')
      expect(summary.isDeleted).toBe(false)
    })

    it('should set creation and modification times', () => {
      const network: Network = NetworkFn.createNetwork('test-network-5')
      const beforeTime = new Date()

      const summary = getBaseSummary({
        name: 'Test Network',
        network,
      })

      const afterTime = new Date()

      expect(summary.creationTime).toBeInstanceOf(Date)
      expect(summary.modificationTime).toBeInstanceOf(Date)
      expect(summary.creationTime.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      )
      expect(summary.creationTime.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      )
      expect(summary.creationTime.getTime()).toBe(
        summary.modificationTime.getTime(),
      )
    })

    it('should use default description when not provided', () => {
      const network: Network = NetworkFn.createNetwork('test-network-6')

      const summary = getBaseSummary({
        name: 'Test Network',
        network,
      })

      expect(summary.description).toBe('Created by Cytoscape Web.')
    })

    it('should handle empty network', () => {
      const network: Network = NetworkFn.createNetwork('test-network-7')

      const summary = getBaseSummary({
        name: 'Empty Network',
        network,
      })

      expect(summary.nodeCount).toBe(0)
      expect(summary.edgeCount).toBe(0)
      expect(summary.externalId).toBe('test-network-7')
    })

    it('should handle network with many nodes and edges', () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }))
      const edges = Array.from({ length: 50 }, (_, i) => ({
        id: `e${i}`,
        s: `${i}`,
        t: `${i + 1}`,
      }))
      const network = NetworkFn.createNetworkFromLists(
        'test-network-8',
        nodes,
        edges,
      )

      const summary = getBaseSummary({
        name: 'Large Network',
        network,
      })

      expect(summary.nodeCount).toBe(100)
      expect(summary.edgeCount).toBe(50)
    })
  })
})

