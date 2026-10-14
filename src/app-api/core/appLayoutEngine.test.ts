// @vitest-environment node
// src/app-api/core/appLayoutEngine.test.ts
//
// The adapter between an app's registerLayout() options and the host's
// LayoutEngine contract. Stores are mocked; the cleanup registry is real so
// the module-level registerAppCleanup() call is exercised.
import { enableMapSet } from 'immer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanupAllForApp } from '../../data/hooks/stores/AppCleanupRegistry'
import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { logApi } from '../../debug'
import type { IdType } from '../../models/IdType'
import type { AppContextApis } from '../types/AppContext'
import type {
  LayoutPositions,
  LayoutRunContext,
  RegisterLayoutOptions,
} from '../types/AppResourceTypes'
import {
  appEngineApply,
  buildAppLayoutAlgorithm,
  getAppLayoutMeta,
  isAppLayoutEnabled,
  qualifiedLayoutName,
  registerAppLayout,
  unregisterAllAppLayouts,
  unregisterAppLayout,
} from './appLayoutEngine'

enableMapSet()

vi.mock('./perAppApis', () => ({
  buildPerAppApis: vi.fn((appId: string) => ({ boundTo: appId })),
}))

vi.mock('../../data/hooks/stores/LayoutStore', () => ({
  useLayoutStore: { getState: vi.fn() },
}))

vi.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: { getState: vi.fn() },
}))

vi.mock('../../debug', () => ({
  logApi: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const APP = 'appX'
const NET = 'net1'

const nodes = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }]
const edges = [{ id: 'e1', s: 'n1', t: 'n2' }]

function makeLayoutStore() {
  return {
    layoutEngines: [] as Array<{ name: string; appId?: string }>,
    upsertAppAlgorithm: vi.fn(),
    removeAppAlgorithm: vi.fn(),
    removeAppEngine: vi.fn(),
  }
}

function makeOptions(
  overrides: Partial<RegisterLayoutOptions> = {},
): RegisterLayoutOptions {
  return {
    id: 'row',
    displayName: 'Row Layout',
    description: 'Nodes on one row',
    type: 'geometric',
    parameters: [
      {
        displayName: 'Spacing',
        type: 'text',
        validationType: 'digits',
        defaultValue: 60,
        description: 'Gap',
        groups: ['Geometry'],
      },
      { displayName: 'Label', type: 'text', defaultValue: 'x' },
    ],
    run: vi.fn(
      async (): Promise<LayoutPositions> => ({ n1: [0, 0], n2: [60, 0] }),
    ),
    ...overrides,
  }
}

describe('appLayoutEngine', () => {
  let layoutStore: ReturnType<typeof makeLayoutStore>

  beforeEach(() => {
    vi.clearAllMocks()
    unregisterAllAppLayouts(APP)
    layoutStore = makeLayoutStore()
    vi.mocked(useLayoutStore.getState).mockReturnValue(layoutStore as any)
    vi.mocked(useViewModelStore.getState).mockReturnValue({
      getViewModel: vi.fn((id: IdType) =>
        id === NET
          ? {
              nodeViews: {
                n1: { id: 'n1', x: 1, y: 2 },
                n2: { id: 'n2', x: 3, y: 4 },
                n3: { id: 'n3', x: 5, y: 6 },
              },
              selectedNodes: ['n2'],
              selectedEdges: [],
            }
          : undefined,
      ),
    } as any)
  })

  describe('buildAppLayoutAlgorithm', () => {
    it('maps the options onto the internal LayoutAlgorithm shape', () => {
      const algorithm = buildAppLayoutAlgorithm(APP, makeOptions())

      expect(algorithm.name).toBe(qualifiedLayoutName(APP, 'row'))
      expect(algorithm.name).toBe('appX::row')
      expect(algorithm.engineName).toBe(APP)
      expect(algorithm.displayName).toBe('Row Layout')
      expect(algorithm.description).toBe('Nodes on one row')
      expect(algorithm.type).toBe('geometric')
      // values keyed by the key rule (displayName), typed by declaration
      expect(algorithm.parameters).toEqual({ Spacing: 60, Label: 'x' })
      // editables are the definitions, in order, each with its key as `name`
      expect(algorithm.editables).toEqual([
        {
          name: 'Spacing',
          displayName: 'Spacing',
          type: 'text',
          validationType: 'digits',
          defaultValue: 60,
          description: 'Gap',
          groups: ['Geometry'],
        },
        {
          name: 'Label',
          displayName: 'Label',
          type: 'text',
          defaultValue: 'x',
        },
      ])
      // parameters and editables share keys — what setLayoutOption needs
      expect((algorithm.editables ?? []).map((e) => e.name).sort()).toEqual(
        Object.keys(algorithm.parameters).sort(),
      )
    })

    it('group-qualifies colliding labels and coerces defaults', () => {
      const algorithm = buildAppLayoutAlgorithm(
        APP,
        makeOptions({
          type: undefined,
          description: undefined,
          threshold: 500,
          parameters: [
            {
              displayName: 'Gap',
              type: 'text',
              validationType: 'number',
              defaultValue: 1.5,
              groups: ['Nodes'],
            },
            {
              displayName: 'Gap',
              type: 'text',
              validationType: 'digits',
              defaultValue: 4,
              groups: ['Clusters'],
            },
            { displayName: 'On', type: 'checkBox', defaultValue: true },
          ],
        }),
      )

      expect(algorithm.type).toBe('other')
      expect(algorithm.description).toBe('')
      expect(algorithm.threshold).toBe(500)
      expect((algorithm.editables ?? []).map((e) => e.name)).toEqual([
        'Nodes/Gap',
        'Clusters/Gap',
        'On',
      ])
      expect(algorithm.parameters).toEqual({
        'Nodes/Gap': 1.5,
        'Clusters/Gap': 4,
        On: true,
      })
    })

    it('has no editables when no parameters are declared', () => {
      const algorithm = buildAppLayoutAlgorithm(
        APP,
        makeOptions({ parameters: undefined }),
      )
      expect(algorithm.parameters).toEqual({})
      expect(algorithm.editables).toBeUndefined()
    })
  })

  describe('registration bookkeeping', () => {
    it('registerAppLayout upserts into the layout store with the shared apply', () => {
      registerAppLayout(APP, makeOptions())

      expect(layoutStore.upsertAppAlgorithm).toHaveBeenCalledWith(
        APP,
        expect.objectContaining({ name: 'appX::row' }),
        appEngineApply,
      )
      expect(getAppLayoutMeta('appX::row')).toEqual({ appId: APP, id: 'row' })
    })

    it('refuses an app id that names a built-in engine', () => {
      layoutStore.layoutEngines = [
        { name: 'G6' },
        { name: 'other', appId: 'other' },
      ]
      expect(() => registerAppLayout('G6', makeOptions())).toThrow(/built-in/)
      expect(layoutStore.upsertAppAlgorithm).not.toHaveBeenCalled()
      // Only a built-in engine's name is reserved: an app engine is found by
      // appId and a re-registration under the same app id is the normal case.
      registerAppLayout('other', makeOptions())
      expect(layoutStore.upsertAppAlgorithm).toHaveBeenCalledTimes(1)
    })

    it('unregisterAppLayout removes one algorithm', () => {
      registerAppLayout(APP, makeOptions())
      registerAppLayout(APP, makeOptions({ id: 'grid' }))

      unregisterAppLayout(APP, 'row')

      expect(layoutStore.removeAppAlgorithm).toHaveBeenCalledWith(
        APP,
        'appX::row',
      )
      expect(getAppLayoutMeta('appX::row')).toBeUndefined()
      expect(getAppLayoutMeta('appX::grid')).toBeDefined()
    })

    it('unregisterAllAppLayouts removes the engine and only that app’s entries', () => {
      registerAppLayout(APP, makeOptions())
      registerAppLayout('other', makeOptions())

      unregisterAllAppLayouts(APP)

      expect(layoutStore.removeAppEngine).toHaveBeenCalledWith(APP)
      expect(getAppLayoutMeta('appX::row')).toBeUndefined()
      expect(getAppLayoutMeta('other::row')).toBeDefined()
      unregisterAllAppLayouts('other')
    })

    it('is wired into the app cleanup registry', () => {
      registerAppLayout(APP, makeOptions())

      cleanupAllForApp(APP)

      expect(layoutStore.removeAppEngine).toHaveBeenCalledWith(APP)
      expect(getAppLayoutMeta('appX::row')).toBeUndefined()
    })
  })

  describe('isAppLayoutEnabled', () => {
    const apis = { boundTo: APP } as unknown as AppContextApis

    it('is true without an isEnabled hook and false for an unknown algorithm', () => {
      registerAppLayout(APP, makeOptions({ isEnabled: undefined }))
      expect(isAppLayoutEnabled('appX::row', apis)).toBe(true)
      expect(isAppLayoutEnabled('appX::missing', apis)).toBe(false)
    })

    it('passes the apis through and treats a throw as false', () => {
      const isEnabled = vi.fn(() => false)
      registerAppLayout(APP, makeOptions({ isEnabled }))
      expect(isAppLayoutEnabled('appX::row', apis)).toBe(false)
      expect(isEnabled).toHaveBeenCalledWith(apis)

      registerAppLayout(
        APP,
        makeOptions({
          isEnabled: () => {
            throw new Error('boom')
          },
        }),
      )
      expect(isAppLayoutEnabled('appX::row', apis)).toBe(false)
      expect(logApi.error).toHaveBeenCalled()
    })
  })

  describe('appEngineApply', () => {
    it('builds the run context from the view model and hands positions to afterLayout', async () => {
      const run = vi.fn(async (ctx: LayoutRunContext) => {
        // Only n1 and n2 move; n3 keeps its position; 'ghost' is not a node
        void ctx
        return { n1: [10, 10], n2: [20, 20], ghost: [0, 0] } as any
      })
      registerAppLayout(APP, makeOptions({ run }))
      const algorithm = buildAppLayoutAlgorithm(APP, makeOptions())
      const afterLayout = vi.fn()

      await appEngineApply(nodes, edges, afterLayout, algorithm, NET)

      expect(run).toHaveBeenCalledTimes(1)
      const ctx: LayoutRunContext = run.mock.calls[0][0]
      expect(ctx.networkId).toBe(NET)
      expect(ctx.nodes).toBe(nodes)
      expect(ctx.edges).toBe(edges)
      expect(ctx.positions).toEqual({ n1: [1, 2], n2: [3, 4], n3: [5, 6] })
      expect(ctx.selectedNodeIds).toEqual(['n2'])
      expect(ctx.parameters).toEqual({ Spacing: 60, Label: 'x' })
      expect(ctx.parameters).not.toBe(algorithm.parameters)
      expect(ctx.apis).toEqual({ boundTo: APP })

      expect(afterLayout).toHaveBeenCalledTimes(1)
      const map: Map<IdType, [number, number]> = afterLayout.mock.calls[0][0]
      expect([...map.entries()]).toEqual([
        ['n1', [10, 10]],
        ['n2', [20, 20]],
      ])
      expect(logApi.warn).toHaveBeenCalled() // the dropped 'ghost' entry
    })

    it('passes the current parameter values, not the registration defaults', async () => {
      const run = vi.fn(async (_ctx: LayoutRunContext) => ({}))
      registerAppLayout(APP, makeOptions({ run }))
      const edited = {
        ...buildAppLayoutAlgorithm(APP, makeOptions()),
        parameters: { Spacing: 99, Label: 'y' },
      }

      await appEngineApply(nodes, edges, vi.fn(), edited, NET)

      expect(run.mock.calls[0][0].parameters).toEqual({
        Spacing: 99,
        Label: 'y',
      })
    })

    it('accepts a synchronous run result', async () => {
      registerAppLayout(APP, makeOptions({ run: () => ({ n1: [7, 7] }) }))
      const afterLayout = vi.fn()

      await appEngineApply(
        nodes,
        edges,
        afterLayout,
        buildAppLayoutAlgorithm(APP, makeOptions()),
        NET,
      )

      expect(afterLayout.mock.calls[0][0].get('n1')).toEqual([7, 7])
    })

    it('rejects, without calling afterLayout, when the algorithm is not registered', async () => {
      const afterLayout = vi.fn()
      await expect(
        appEngineApply(
          nodes,
          edges,
          afterLayout,
          buildAppLayoutAlgorithm(APP, makeOptions()),
          NET,
        ),
      ).rejects.toThrow(/not registered/)
      expect(afterLayout).not.toHaveBeenCalled()
    })

    it('rejects when no network id is given or the network has no view', async () => {
      registerAppLayout(APP, makeOptions())
      const algorithm = buildAppLayoutAlgorithm(APP, makeOptions())

      await expect(
        appEngineApply(nodes, edges, vi.fn(), algorithm),
      ).rejects.toThrow(/network/)
      await expect(
        appEngineApply(nodes, edges, vi.fn(), algorithm, 'unknown'),
      ).rejects.toThrow(/view/)
    })

    it('rejects and logs when run throws or rejects', async () => {
      registerAppLayout(
        APP,
        makeOptions({
          run: () => {
            throw new Error('sync boom')
          },
        }),
      )
      const algorithm = buildAppLayoutAlgorithm(APP, makeOptions())
      const afterLayout = vi.fn()

      await expect(
        appEngineApply(nodes, edges, afterLayout, algorithm, NET),
      ).rejects.toThrow('sync boom')

      registerAppLayout(
        APP,
        makeOptions({
          run: async () => Promise.reject(new Error('async boom')),
        }),
      )
      await expect(
        appEngineApply(nodes, edges, afterLayout, algorithm, NET),
      ).rejects.toThrow('async boom')

      expect(afterLayout).not.toHaveBeenCalled()
      expect(logApi.error).toHaveBeenCalledTimes(2)
    })

    it('rejects a malformed result', async () => {
      registerAppLayout(APP, makeOptions({ run: () => 'nope' as any }))
      await expect(
        appEngineApply(
          nodes,
          edges,
          vi.fn(),
          buildAppLayoutAlgorithm(APP, makeOptions()),
          NET,
        ),
      ).rejects.toThrow(/positions/)
    })

    it('rejects an array result instead of treating it as an empty map', async () => {
      registerAppLayout(APP, makeOptions({ run: () => [] as any }))
      const afterLayout = vi.fn()
      await expect(
        appEngineApply(
          nodes,
          edges,
          afterLayout,
          buildAppLayoutAlgorithm(APP, makeOptions()),
          NET,
        ),
      ).rejects.toThrow(/got an array/)
      expect(afterLayout).not.toHaveBeenCalled()
    })

    it('discards the result when the algorithm was unregistered while running', async () => {
      let release: () => void = () => {}
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      registerAppLayout(
        APP,
        makeOptions({
          run: async () => {
            await gate
            return { n1: [0, 0] }
          },
        }),
      )
      const afterLayout = vi.fn()
      const pending = appEngineApply(
        nodes,
        edges,
        afterLayout,
        buildAppLayoutAlgorithm(APP, makeOptions()),
        NET,
      )

      unregisterAllAppLayouts(APP) // e.g. the app was disabled
      release()

      await expect(pending).rejects.toThrow(/unregistered/)
      expect(afterLayout).not.toHaveBeenCalled()
    })
  })
})
