import { Cx2 } from '../../Cx2'
import { createViewModelFromCX } from './viewModelConverter'

// to run these: npx jest src/models/CxModel/impl/converters/viewModelConverter.test.ts

describe('viewModelConverter', () => {
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

  describe('createViewModelFromCX', () => {
    it('should create an empty view model from minimal CX2', () => {
      const networkId = 'test-network-1'
      const cx2 = createMinimalValidCx()

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.id).toBe(networkId)
      expect(Object.keys(networkView.nodeViews)).toHaveLength(0)
      expect(Object.keys(networkView.edgeViews)).toHaveLength(0)
      expect(networkView.selectedNodes).toEqual([])
      expect(networkView.selectedEdges).toEqual([])
    })

    it('should create a view model with nodes', () => {
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

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.id).toBe(networkId)
      expect(Object.keys(networkView.nodeViews)).toHaveLength(3)
      expect(networkView.nodeViews['1']).toBeDefined()
      expect(networkView.nodeViews['2']).toBeDefined()
      expect(networkView.nodeViews['3']).toBeDefined()
    })

    it('should create a view model with edges', () => {
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

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(Object.keys(networkView.edgeViews)).toHaveLength(2)
      expect(networkView.edgeViews['e1']).toBeDefined()
      expect(networkView.edgeViews['e2']).toBeDefined()
      expect(networkView.edgeViews['e1'].id).toBe('e1')
      expect(networkView.edgeViews['e2'].id).toBe('e2')
    })

    it('should use node positions from CX2', () => {
      const networkId = 'test-network-4'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1, x: 10, y: 20 },
            { id: 2, x: 30, y: 40 },
            { id: 3, x: 50, y: 60 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.nodeViews['1'].x).toBe(10)
      expect(networkView.nodeViews['1'].y).toBe(20)
      expect(networkView.nodeViews['2'].x).toBe(30)
      expect(networkView.nodeViews['2'].y).toBe(40)
      expect(networkView.nodeViews['3'].x).toBe(50)
      expect(networkView.nodeViews['3'].y).toBe(60)
    })

    it('should use default positions (0, 0) when node positions are missing', () => {
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
          status: [{ success: true }],
        },
      ]

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.nodeViews['1'].x).toBe(0)
      expect(networkView.nodeViews['1'].y).toBe(0)
      expect(networkView.nodeViews['2'].x).toBe(0)
      expect(networkView.nodeViews['2'].y).toBe(0)
    })

    it('should handle node z-coordinates', () => {
      const networkId = 'test-network-6'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1, x: 10, y: 20, z: 5 },
            { id: 2, x: 30, y: 40, z: 10 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.nodeViews['1'].z).toBe(5)
      expect(networkView.nodeViews['2'].z).toBe(10)
    })

    it('should not include z-coordinate when not provided', () => {
      const networkId = 'test-network-7'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1, x: 10, y: 20 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.nodeViews['1'].z).toBeUndefined()
    })

    it('should initialize node values as empty maps', () => {
      const networkId = 'test-network-8'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.nodeViews['1'].values).toBeInstanceOf(Map)
      expect(networkView.nodeViews['1'].values.size).toBe(0)
    })

    it('should initialize edge values as empty maps', () => {
      const networkId = 'test-network-9'
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

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.edgeViews['e1'].values).toBeInstanceOf(Map)
      expect(networkView.edgeViews['e1'].values.size).toBe(0)
    })

    it('should translate edge ids with "e" prefix', () => {
      const networkId = 'test-network-10'
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
            { id: 10, s: 1, t: 2 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.edgeViews['e1']).toBeDefined()
      expect(networkView.edgeViews['e2']).toBeDefined()
      expect(networkView.edgeViews['e10']).toBeDefined()
      expect(networkView.edgeViews['e1'].id).toBe('e1')
      expect(networkView.edgeViews['e2'].id).toBe('e2')
      expect(networkView.edgeViews['e10'].id).toBe('e10')
    })

    it('should create a complete view model with nodes and edges', () => {
      const networkId = 'test-network-11'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1, x: 10, y: 20 },
            { id: 2, x: 30, y: 40 },
            { id: 3, x: 50, y: 60 },
          ],
        },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 2, s: 2, t: 3 },
            { id: 3, s: 3, t: 1 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(networkView.id).toBe(networkId)
      expect(Object.keys(networkView.nodeViews)).toHaveLength(3)
      expect(Object.keys(networkView.edgeViews)).toHaveLength(3)
      expect(networkView.nodeViews['1'].x).toBe(10)
      expect(networkView.nodeViews['1'].y).toBe(20)
      expect(networkView.edgeViews['e1']).toBeDefined()
      expect(networkView.edgeViews['e2']).toBeDefined()
      expect(networkView.edgeViews['e3']).toBeDefined()
    })

    it('should handle empty nodes and edges arrays', () => {
      const networkId = 'test-network-12'
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

      const networkView = createViewModelFromCX(networkId, cx2)

      expect(Object.keys(networkView.nodeViews)).toHaveLength(0)
      expect(Object.keys(networkView.edgeViews)).toHaveLength(0)
    })
  })
})

