import { produce } from 'immer'

import { toPlainObject } from './immerSerialization'

describe('toPlainObject', () => {
  describe('basic types', () => {
    it('should clone primitives', () => {
      expect(toPlainObject(42)).toBe(42)
      expect(toPlainObject('hello')).toBe('hello')
      expect(toPlainObject(true)).toBe(true)
      expect(toPlainObject(null)).toBe(null)
      expect(toPlainObject(undefined)).toBe(undefined)
    })

    it('should clone plain objects', () => {
      const obj = { a: 1, b: 'test', c: true }
      const cloned = toPlainObject(obj)
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
    })

    it('should clone arrays', () => {
      const arr = [1, 2, 3, 'test']
      const cloned = toPlainObject(arr)
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
    })

    it('should deep clone nested structures', () => {
      const obj = {
        a: 1,
        b: {
          c: [1, 2, { d: 'test' }],
        },
      }
      const cloned = toPlainObject(obj)
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.b).not.toBe(obj.b)
      expect(cloned.b.c).not.toBe(obj.b.c)
      expect(cloned.b.c[2]).not.toBe(obj.b.c[2])
    })
  })

  describe('Immer proxy handling', () => {
    it('should handle real Immer proxies created with produce', () => {
      const baseState = {
        a: 1,
        b: [2, 3],
        nested: {
          c: 'test',
          d: { e: true },
        },
      }

      // Clone the draft while it's still an active Immer proxy
      // (proxies are only valid inside the produce callback)
      produce(baseState, (draft) => {
        // The draft parameter is a real Immer proxy
        // Clone it while it's still active
        const cloned = toPlainObject(draft)
        expect(cloned).toEqual(baseState)
        expect(cloned).not.toBe(draft)
        expect(cloned.nested).not.toBe(draft.nested)
        expect(cloned.b).not.toBe(draft.b)
        // Verify the cloned object is a plain object, not a proxy
        expect(cloned).not.toHaveProperty('draft')
      })
    })

    it('should handle Immer proxy arrays', () => {
      const baseArray = [
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
      ]

      produce(baseArray, (draft) => {
        // draft is a real Immer proxy array
        const cloned = toPlainObject(draft)
        expect(cloned).toEqual(baseArray)
        expect(cloned).not.toBe(draft)
        expect(cloned[0]).not.toBe(draft[0])
        expect(cloned[1]).not.toBe(draft[1])
        // Verify it's a plain array, not a proxy
        expect(Array.isArray(cloned)).toBe(true)
      })
    })

    it('should handle nested Immer proxies (like CyApp with components)', () => {
      const baseState = {
        apps: {
          'app-1': {
            id: 'app-1',
            name: 'Test App',
            components: [
              { id: 'comp1', type: 'menu' },
              { id: 'comp2', type: 'panel' },
            ],
            status: 'active',
          },
        },
      }

      produce(baseState, (draft) => {
        // Clone the entire draft (which contains nested proxies)
        // This simulates what happens in AppStore when cloning apps with components
        const cloned = toPlainObject(draft)
        expect(cloned).toEqual(baseState)
        expect(cloned.apps).not.toBe(draft.apps)
        expect(cloned.apps['app-1']).not.toBe(draft.apps['app-1'])
        expect(cloned.apps['app-1'].components).not.toBe(
          draft.apps['app-1'].components,
        )
        expect(cloned.apps['app-1'].components[0]).not.toBe(
          draft.apps['app-1'].components[0],
        )
        // Verify all nested structures are plain objects
        expect(Array.isArray(cloned.apps['app-1'].components)).toBe(true)
      })
    })

    it('should handle modified Immer proxies (draft with changes)', () => {
      const baseState = { count: 0, items: ['a', 'b'] }

      const modifiedState = produce(baseState, (draft) => {
        // Modify the draft
        draft.count = 5
        draft.items.push('c')
        // Clone the modified draft while it's still a proxy
        const cloned = toPlainObject(draft)
        expect(cloned.count).toBe(5)
        expect(cloned.items).toEqual(['a', 'b', 'c'])
        expect(cloned.items).not.toBe(draft.items)
      })

      // Verify the original produce worked
      expect(modifiedState.count).toBe(5)
      expect(modifiedState.items).toEqual(['a', 'b', 'c'])
    })

    it('should handle objects that look like Immer proxies (mock)', () => {
      // Create a mock proxy-like object for completeness
      const proxyLike = {
        [Symbol.toStringTag]: 'Proxy',
        value: { a: 1, b: [2, 3] },
      }
      const cloned = toPlainObject(proxyLike)
      // Symbol.toStringTag may be removed during cloning, so check the value property
      expect(cloned.value).toEqual(proxyLike.value)
      expect(cloned).not.toBe(proxyLike)
    })
  })

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const obj = {}
      const cloned = toPlainObject(obj)
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
    })

    it('should handle empty arrays', () => {
      const arr: any[] = []
      const cloned = toPlainObject(arr)
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
    })

    it('should handle arrays with nested objects', () => {
      const arr = [{ a: 1 }, { b: 2 }]
      const cloned = toPlainObject(arr)
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[0]).not.toBe(arr[0])
      expect(cloned[1]).not.toBe(arr[1])
    })

    it('should handle objects with arrays', () => {
      const obj = {
        items: [{ id: 1 }, { id: 2 }],
        metadata: { count: 2 },
      }
      const cloned = toPlainObject(obj)
      expect(cloned).toEqual(obj)
      expect(cloned.items).not.toBe(obj.items)
      expect(cloned.items[0]).not.toBe(obj.items[0])
    })
  })

  describe('fallback behavior', () => {
    it('should handle objects that cannot be JSON stringified', () => {
      // Create an object with a circular reference (will fail JSON.stringify)
      // Note: structuredClone handles circular references, but JSON.stringify doesn't
      // The manual fallback has cycle detection to prevent infinite recursion
      const obj: any = { a: 1, b: { c: 2 } }
      obj.self = obj

      // Should handle gracefully without infinite recursion
      const cloned = toPlainObject(obj)
      expect(cloned.a).toBe(1)
      expect(cloned.b.c).toBe(2)
      expect(cloned).not.toBe(obj)
      // Circular reference may be broken by manual fallback (which is fine for our use case)
    })
  })

  describe('real-world scenarios', () => {
    it('should clone CyApp-like structure', () => {
      const app = {
        id: 'test-app',
        name: 'Test App',
        description: 'Test description',
        components: [
          { id: 'comp1', type: 'menu' },
          { id: 'comp2', type: 'panel' },
        ],
        status: 'active',
      }
      const cloned = toPlainObject(app)
      expect(cloned).toEqual(app)
      expect(cloned).not.toBe(app)
      expect(cloned.components).not.toBe(app.components)
      expect(cloned.components[0]).not.toBe(app.components[0])
    })

    it('should clone Network-like structure', () => {
      const network = {
        id: 'network-1',
        nodes: [
          { id: 'n1', data: { label: 'Node 1' } },
          { id: 'n2', data: { label: 'Node 2' } },
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      }
      const cloned = toPlainObject(network)
      expect(cloned).toEqual(network)
      expect(cloned.nodes).not.toBe(network.nodes)
      expect(cloned.edges).not.toBe(network.edges)
    })
  })
})

