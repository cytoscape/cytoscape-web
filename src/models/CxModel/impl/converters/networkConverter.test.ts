import { Cx2 } from '../../Cx2'
import { createNetworkFromCx, translateCXEdgeId } from './networkConverter'

// to run these: npx jest src/models/CxModel/impl/converters/networkConverter.test.ts

describe('networkConverter', () => {
  // Helper function to create a minimal valid CX2 document
  const createMinimalValidCx = (): Cx2 => [
    {
      CXVersion: '2.0',
    },
    {
      status: [
        {
          success: true,
        },
      ],
    },
  ]

  describe('translateCXEdgeId', () => {
    it('should add "e" prefix to edge id', () => {
      expect(translateCXEdgeId('1')).toBe('e1')
      expect(translateCXEdgeId('10')).toBe('e10')
      expect(translateCXEdgeId('123')).toBe('e123')
    })

    it('should handle string edge ids', () => {
      expect(translateCXEdgeId('edge-1')).toBe('eedge-1')
      expect(translateCXEdgeId('abc')).toBe('eabc')
    })
  })

  describe('createNetworkFromCx', () => {
    it('should create an empty network from minimal CX2', () => {
      const networkId = 'test-network-1'
      const cx2 = createMinimalValidCx()

      const network = createNetworkFromCx(networkId, cx2)

      expect(network.id).toBe(networkId)
      expect(network.nodes).toEqual([])
      expect(network.edges).toEqual([])
    })

    it('should create a network with nodes', () => {
      const networkId = 'test-network-2'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const network = createNetworkFromCx(networkId, cx2)

      expect(network.id).toBe(networkId)
      expect(network.nodes).toHaveLength(3)
      expect(network.nodes.map(n => n.id)).toContain('1')
      expect(network.nodes.map(n => n.id)).toContain('2')
      expect(network.nodes.map(n => n.id)).toContain('3')
    })

    it('should create a network with edges', () => {
      const networkId = 'test-network-3'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 2, s: 2, t: 1 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const network = createNetworkFromCx(networkId, cx2)

      expect(network.id).toBe(networkId)
      expect(network.nodes).toHaveLength(2)
      expect(network.edges).toHaveLength(2)
      expect(network.edges.map(e => e.id)).toContain('e1')
      expect(network.edges.map(e => e.id)).toContain('e2')
      expect(network.edges.find(e => e.id === 'e1')?.s).toBe('1')
      expect(network.edges.find(e => e.id === 'e1')?.t).toBe('2')
    })

    it('should handle nodes with @id property', () => {
      const networkId = 'test-network-4'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { '@id': 1 },
            { '@id': 2 },
          ] as any,
        },
        {
          status: [{ success: true }],
        },
      ]

      const network = createNetworkFromCx(networkId, cx2)

      expect(network.nodes).toHaveLength(2)
      expect(network.nodes.map(n => n.id)).toContain('1')
      expect(network.nodes.map(n => n.id)).toContain('2')
    })

    it('should handle edges with @id property', () => {
      const networkId = 'test-network-5'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
        {
          edges: [
            { '@id': 1, s: 1, t: 2 },
            { '@id': 2, s: 2, t: 1 },
          ] as any,
        },
        {
          status: [{ success: true }],
        },
      ]

      const network = createNetworkFromCx(networkId, cx2)

      expect(network.edges).toHaveLength(2)
      expect(network.edges.map(e => e.id)).toContain('e1')
      expect(network.edges.map(e => e.id)).toContain('e2')
    })

    it('should create a network with multiple nodes and edges', () => {
      const networkId = 'test-network-6'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
          ],
        },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 2, s: 2, t: 3 },
            { id: 3, s: 3, t: 4 },
            { id: 4, s: 4, t: 1 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const network = createNetworkFromCx(networkId, cx2)

      expect(network.nodes).toHaveLength(4)
      expect(network.edges).toHaveLength(4)
      expect(network.edges.map(e => e.id)).toEqual(['e1', 'e2', 'e3', 'e4'])
    })

    it('should convert node and edge ids to strings', () => {
      const networkId = 'test-network-7'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const network = createNetworkFromCx(networkId, cx2)

      expect(typeof network.nodes[0].id).toBe('string')
      expect(typeof network.edges[0].id).toBe('string')
      expect(typeof network.edges[0].s).toBe('string')
      expect(typeof network.edges[0].t).toBe('string')
    })

    it('should handle empty nodes and edges arrays', () => {
      const networkId = 'test-network-8'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [],
        },
        {
          edges: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const network = createNetworkFromCx(networkId, cx2)

      expect(network.nodes).toEqual([])
      expect(network.edges).toEqual([])
    })
  })
})

