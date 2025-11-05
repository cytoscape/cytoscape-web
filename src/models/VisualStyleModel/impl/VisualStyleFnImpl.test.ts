import NetworkFn from '../../NetworkModel'
import { createTable } from '../../TableModel/impl/InMemoryTable'
import { createViewModel } from '../../ViewModel/impl/ViewModelImpl'
import { VisualPropertyGroup } from '../VisualPropertyGroup'
import { VisualStyle } from '../VisualStyle'
import {
  applyVisualStyle,
  createVisualStyle,
  edgeVisualProperties,
  networkVisualProperties,
  nodeVisualProperties,
} from './VisualStyleFnImpl'

// to run these: npx jest src/models/VisualStyleModel/impl/VisualStyleFnImpl.test.ts

describe('VisualStyleFnImpl', () => {
  describe('createVisualStyle', () => {
    it('should create a default visual style', () => {
      const visualStyle = createVisualStyle()

      expect(visualStyle).toBeDefined()
      expect(visualStyle.nodeShape).toBeDefined()
      expect(visualStyle.nodeBackgroundColor).toBeDefined()
      expect(visualStyle.edgeWidth).toBeDefined()
    })

    it('should return a new instance each time', () => {
      const style1 = createVisualStyle()
      const style2 = createVisualStyle()

      expect(style1).not.toBe(style2)
    })
  })

  describe('nodeVisualProperties', () => {
    it('should return only node visual properties', () => {
      const visualStyle = createVisualStyle()
      const nodeProps = nodeVisualProperties(visualStyle)

      expect(Array.isArray(nodeProps)).toBe(true)
      nodeProps.forEach((prop) => {
        expect(prop.group).toBe(VisualPropertyGroup.Node)
      })
    })

    it('should return sorted properties by display name', () => {
      const visualStyle = createVisualStyle()
      const nodeProps = nodeVisualProperties(visualStyle)

      if (nodeProps.length > 1) {
        for (let i = 0; i < nodeProps.length - 1; i++) {
          const nameA = nodeProps[i].displayName.toLowerCase()
          const nameB = nodeProps[i + 1].displayName.toLowerCase()
          expect(nameA <= nameB).toBe(true)
        }
      }
    })

    it('should not include edge or network properties', () => {
      const visualStyle = createVisualStyle()
      const nodeProps = nodeVisualProperties(visualStyle)

      nodeProps.forEach((prop) => {
        expect(prop.group).not.toBe(VisualPropertyGroup.Edge)
        expect(prop.group).not.toBe(VisualPropertyGroup.Network)
      })
    })
  })

  describe('edgeVisualProperties', () => {
    it('should return only edge visual properties', () => {
      const visualStyle = createVisualStyle()
      const edgeProps = edgeVisualProperties(visualStyle)

      expect(Array.isArray(edgeProps)).toBe(true)
      edgeProps.forEach((prop) => {
        expect(prop.group).toBe(VisualPropertyGroup.Edge)
      })
    })

    it('should return sorted properties by display name', () => {
      const visualStyle = createVisualStyle()
      const edgeProps = edgeVisualProperties(visualStyle)

      if (edgeProps.length > 1) {
        for (let i = 0; i < edgeProps.length - 1; i++) {
          const nameA = edgeProps[i].displayName.toLowerCase()
          const nameB = edgeProps[i + 1].displayName.toLowerCase()
          expect(nameA <= nameB).toBe(true)
        }
      }
    })

    it('should not include node or network properties', () => {
      const visualStyle = createVisualStyle()
      const edgeProps = edgeVisualProperties(visualStyle)

      edgeProps.forEach((prop) => {
        expect(prop.group).not.toBe(VisualPropertyGroup.Node)
        expect(prop.group).not.toBe(VisualPropertyGroup.Network)
      })
    })
  })

  describe('networkVisualProperties', () => {
    it('should return only network visual properties', () => {
      const visualStyle = createVisualStyle()
      const networkProps = networkVisualProperties(visualStyle)

      expect(Array.isArray(networkProps)).toBe(true)
      networkProps.forEach((prop) => {
        expect(prop.group).toBe(VisualPropertyGroup.Network)
      })
    })

    it('should return sorted properties by display name', () => {
      const visualStyle = createVisualStyle()
      const networkProps = networkVisualProperties(visualStyle)

      if (networkProps.length > 1) {
        for (let i = 0; i < networkProps.length - 1; i++) {
          const nameA = networkProps[i].displayName.toLowerCase()
          const nameB = networkProps[i + 1].displayName.toLowerCase()
          expect(nameA <= nameB).toBe(true)
        }
      }
    })

    it('should not include node or edge properties', () => {
      const visualStyle = createVisualStyle()
      const networkProps = networkVisualProperties(visualStyle)

      networkProps.forEach((prop) => {
        expect(prop.group).not.toBe(VisualPropertyGroup.Node)
        expect(prop.group).not.toBe(VisualPropertyGroup.Edge)
      })
    })
  })

  describe('applyVisualStyle', () => {
    it('should create a new network view when networkView is undefined', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network',
        [{ id: '1' }, { id: '2' }],
        [{ id: 'e1', s: '1', t: '2' }],
      )
      const visualStyle = createVisualStyle()
      const nodeTable = createTable('test-nodes')
      const edgeTable = createTable('test-edges')

      const networkView = applyVisualStyle({
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      })

      expect(networkView).toBeDefined()
      expect(networkView.id).toBe(network.id)
      expect(Object.keys(networkView.nodeViews)).toHaveLength(2)
      expect(Object.keys(networkView.edgeViews)).toHaveLength(1)
    })

    it('should update existing network view when provided', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network',
        [{ id: '1' }, { id: '2' }],
        [{ id: 'e1', s: '1', t: '2' }],
      )
      const visualStyle = createVisualStyle()
      const nodeTable = createTable('test-nodes')
      const edgeTable = createTable('test-edges')
      const existingView = createViewModel(network)

      const networkView = applyVisualStyle({
        network,
        visualStyle,
        nodeTable,
        edgeTable,
        networkView: existingView,
      })

      expect(networkView).toBeDefined()
      expect(networkView.id).toBe(network.id)
    })

    it('should handle empty network', () => {
      const network = NetworkFn.createNetwork('test-network')
      const visualStyle = createVisualStyle()
      const nodeTable = createTable('test-nodes')
      const edgeTable = createTable('test-edges')

      const networkView = applyVisualStyle({
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      })

      expect(networkView).toBeDefined()
      expect(Object.keys(networkView.nodeViews)).toHaveLength(0)
      expect(Object.keys(networkView.edgeViews)).toHaveLength(0)
    })
  })
})

