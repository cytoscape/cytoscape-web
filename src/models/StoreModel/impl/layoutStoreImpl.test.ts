// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { LayoutAlgorithm } from '../../LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../LayoutModel/LayoutEngine'
import {
  LayoutState,
  removeAppAlgorithm,
  removeAppEngine,
  setIsRunning,
  setLayoutOption,
  setPreferredLayout,
  upsertAppAlgorithm,
} from './layoutStoreImpl'

// Mock the layout selection module
vi.mock('../../LayoutModel/impl/layoutSelection', () => {
  const mockGridAlgorithm = {
    name: 'grid',
    engineName: 'cyjs',
    displayName: 'Grid',
    type: 'geometric' as const,
    description: 'Grid layout',
    parameters: { spacing: 50 },
    editables: [
      {
        name: 'spacing',
        displayName: 'Spacing',
        type: 'text' as const,
        validationType: 'digits' as const,
        defaultValue: 50,
        description: 'Spacing between nodes',
      },
    ],
  }

  const mockLayoutEngine = {
    name: 'cyjs',
    algorithms: {
      grid: mockGridAlgorithm,
    },
  }

  return {
    LayoutEngines: [mockLayoutEngine],
    defAlgorithm: {
      name: 'default',
      engineName: 'cyjs',
      displayName: 'Default',
      type: 'force' as const,
      description: 'Default layout',
      parameters: {},
    },
    defHierarchicalAlgorithm: {
      name: 'default-hierarchical',
      engineName: 'cyjs',
      displayName: 'Default Hierarchical',
      type: 'hierarchical' as const,
      description: 'Default hierarchical layout',
      parameters: {},
    },
    getLayout: vi.fn((engineName: string, algorithmName: string) => {
      if (engineName === 'cyjs' && algorithmName === 'grid') {
        return mockGridAlgorithm
      }
      return undefined
    }),
  }
})

import {
  defAlgorithm,
  defHierarchicalAlgorithm,
  LayoutEngines,
} from '../../LayoutModel/impl/layoutSelection'

const createDefaultState = (): LayoutState => {
  return {
    layoutEngines: LayoutEngines,
    preferredLayout: defAlgorithm,
    preferredHierarchicalLayout: defHierarchicalAlgorithm,
    isRunning: false,
  }
}

describe('LayoutStoreImpl', () => {
  describe('setPreferredLayout', () => {
    it('should set preferred layout', () => {
      const state = createDefaultState()

      const result = setPreferredLayout(state, 'cyjs', 'grid')

      expect(result.preferredLayout.name).toBe('grid')
      expect(result).not.toBe(state) // Immutability check
    })

    it('should handle non-existent layout gracefully', () => {
      const state = createDefaultState()

      const result = setPreferredLayout(state, 'non-existent', 'non-existent')

      expect(result).toBe(state) // Should return unchanged
    })
  })

  describe('setIsRunning', () => {
    it('should set isRunning flag', () => {
      const state = createDefaultState()

      let result = setIsRunning(state, true)
      expect(result.isRunning).toBe(true)
      expect(result).not.toBe(state) // Immutability check

      result = setIsRunning(result, false)
      expect(result.isRunning).toBe(false)
    })
  })

  describe('setLayoutOption', () => {
    it('should set a layout option', () => {
      const state = createDefaultState()

      const result = setLayoutOption(state, 'cyjs', 'grid', 'spacing', 100)

      const algorithm = result.layoutEngines.find((e) => e.name === 'cyjs')
        ?.algorithms['grid']
      expect(algorithm?.parameters.spacing).toBe(100)
      // Editables are definitions only; the live value lives in parameters
      expect(algorithm?.editables).toBe(
        state.layoutEngines.find((e) => e.name === 'cyjs')?.algorithms['grid']
          .editables,
      )
      expect(result).not.toBe(state) // Immutability check
    })

    it('refuses a key that is not a declared editable, or not in parameters', () => {
      const state = createDefaultState()

      // 'grid' declares only `spacing`
      expect(setLayoutOption(state, 'cyjs', 'grid', 'nope', 1)).toBe(state)

      // an editable whose value is not a top-level parameter (Cosmos shape)
      const cosmosLike = {
        ...state.layoutEngines[0].algorithms['grid'],
        name: 'nested',
        parameters: { simulation: { gravity: 0.3 } },
        editables: [
          {
            name: 'gravity',
            displayName: 'Gravity',
            type: 'text' as const,
            validationType: 'number' as const,
            defaultValue: 0.3,
          },
        ],
      }
      const withNested: LayoutState = {
        ...state,
        layoutEngines: [
          {
            ...state.layoutEngines[0],
            algorithms: {
              ...state.layoutEngines[0].algorithms,
              nested: cosmosLike,
            },
          },
        ],
      }
      expect(setLayoutOption(withNested, 'cyjs', 'nested', 'gravity', 1)).toBe(
        withNested,
      )
    })

    it('should handle non-existent engine gracefully', () => {
      const state = createDefaultState()

      const result = setLayoutOption(
        state,
        'non-existent',
        'grid',
        'spacing',
        100,
      )

      expect(result).toBe(state) // Should return unchanged
    })
  })

  // ── App engines ('layout-algorithm' resources) ──────────────────

  const APP_ID = 'appX'
  const appApply: LayoutEngine['apply'] = vi.fn()

  const makeAppAlgorithm = (localId: string): LayoutAlgorithm => ({
    name: `${APP_ID}::${localId}`,
    engineName: APP_ID,
    displayName: `App ${localId}`,
    type: 'other',
    description: '',
    parameters: { spacing: 10 },
    editables: [
      {
        name: 'spacing',
        displayName: 'Spacing',
        type: 'text' as const,
        validationType: 'digits' as const,
        defaultValue: 10,
      },
    ],
  })

  const findEngine = (
    state: LayoutState,
    name: string,
  ): LayoutEngine | undefined =>
    state.layoutEngines.find((engine) => engine.name === name)

  describe('upsertAppAlgorithm', () => {
    it('creates one engine per app, named after the app id', () => {
      const state = createDefaultState()

      const result = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )

      const engine = findEngine(result, APP_ID)
      expect(engine).toBeDefined()
      expect(engine?.appId).toBe(APP_ID)
      expect(engine?.apply).toBe(appApply)
      expect(engine?.defaultAlgorithmName).toBe(`${APP_ID}::one`)
      expect(Object.keys(engine?.algorithms ?? {})).toEqual([`${APP_ID}::one`])
      // Core engines are untouched and keep their order
      expect(result.layoutEngines[0]).toBe(state.layoutEngines[0])
    })

    it('reuses the app engine for a second algorithm', () => {
      let state = createDefaultState()
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )

      const result = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('two'),
        appApply,
      )

      const appEngines = result.layoutEngines.filter(
        (engine) => engine.appId === APP_ID,
      )
      expect(appEngines).toHaveLength(1)
      expect(Object.keys(appEngines[0].algorithms).sort()).toEqual([
        `${APP_ID}::one`,
        `${APP_ID}::two`,
      ])
    })

    it('replaces an algorithm registered under the same name', () => {
      let state = createDefaultState()
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )
      const replacement: LayoutAlgorithm = {
        ...makeAppAlgorithm('one'),
        displayName: 'Renamed',
      }

      const result = upsertAppAlgorithm(state, APP_ID, replacement, appApply)

      const engine = findEngine(result, APP_ID)
      expect(Object.keys(engine?.algorithms ?? {})).toHaveLength(1)
      expect(engine?.algorithms[`${APP_ID}::one`].displayName).toBe('Renamed')
    })

    it('re-points a preferred layout at the re-registered algorithm', () => {
      let state = createDefaultState()
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )
      state = setPreferredLayout(state, APP_ID, `${APP_ID}::one`)
      state = {
        ...state,
        preferredHierarchicalLayout: state.preferredLayout,
      }
      const replacement: LayoutAlgorithm = {
        ...makeAppAlgorithm('one'),
        displayName: 'Renamed',
      }

      const result = upsertAppAlgorithm(state, APP_ID, replacement, appApply)

      expect(result.preferredLayout).toBe(replacement)
      expect(result.preferredHierarchicalLayout).toBe(replacement)
    })

    it('leaves a preferred layout alone when another algorithm is registered', () => {
      let state = createDefaultState()
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )
      state = setPreferredLayout(state, APP_ID, `${APP_ID}::one`)
      const preferred = state.preferredLayout

      const result = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('two'),
        appApply,
      )

      expect(result.preferredLayout).toBe(preferred)
      expect(result.preferredHierarchicalLayout).toBe(defHierarchicalAlgorithm)
    })

    it('never merges into a built-in engine whose name equals the app id', () => {
      const state = createDefaultState()
      const builtIn = state.layoutEngines[0]
      const algorithm: LayoutAlgorithm = {
        ...makeAppAlgorithm('one'),
        name: `${builtIn.name}::one`,
        engineName: builtIn.name,
      }

      const result = upsertAppAlgorithm(
        state,
        builtIn.name,
        algorithm,
        appApply,
      )

      expect(result.layoutEngines[0]).toBe(builtIn)
      expect(result.layoutEngines).toHaveLength(state.layoutEngines.length + 1)
      const synthetic = result.layoutEngines[result.layoutEngines.length - 1]
      expect(synthetic.appId).toBe(builtIn.name)
      expect(Object.keys(synthetic.algorithms)).toEqual([
        `${builtIn.name}::one`,
      ])
    })

    it('never mutates the engine array it is given', () => {
      const state = createDefaultState()
      const before = state.layoutEngines
      const beforeLength = before.length

      const result = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )

      expect(result.layoutEngines).not.toBe(before)
      expect(before).toHaveLength(beforeLength)
      expect(state.layoutEngines).toBe(before)
    })
  })

  describe('removeAppAlgorithm', () => {
    it('removes the algorithm and drops the engine when it is empty', () => {
      let state = createDefaultState()
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('two'),
        appApply,
      )

      let result = removeAppAlgorithm(state, APP_ID, `${APP_ID}::one`)
      expect(Object.keys(findEngine(result, APP_ID)?.algorithms ?? {})).toEqual(
        [`${APP_ID}::two`],
      )

      result = removeAppAlgorithm(result, APP_ID, `${APP_ID}::two`)
      expect(findEngine(result, APP_ID)).toBeUndefined()
      expect(result.layoutEngines).toHaveLength(
        createDefaultState().layoutEngines.length,
      )
    })

    it('falls back to the built-in default when the removed algorithm was preferred', () => {
      let state = createDefaultState()
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )
      state = setPreferredLayout(state, APP_ID, `${APP_ID}::one`)
      expect(state.preferredLayout.name).toBe(`${APP_ID}::one`)

      const result = removeAppAlgorithm(state, APP_ID, `${APP_ID}::one`)

      expect(result.preferredLayout).toBe(defAlgorithm)
    })

    it('falls back to the live default object held by the store, not the constant', () => {
      // The default carries the user's parameter edits in `layoutEngines`;
      // Apply Default Layout must run that object, not the pristine constant.
      const editedDefault: LayoutAlgorithm = {
        ...defAlgorithm,
        parameters: { spacing: 99 },
      }
      let state: LayoutState = {
        ...createDefaultState(),
        layoutEngines: [
          {
            name: defAlgorithm.engineName,
            algorithms: { [defAlgorithm.name]: editedDefault },
          } as unknown as LayoutEngine,
        ],
      }
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )
      state = setPreferredLayout(state, APP_ID, `${APP_ID}::one`)

      const result = removeAppAlgorithm(state, APP_ID, `${APP_ID}::one`)

      expect(result.preferredLayout).toBe(editedDefault)
      expect(result.preferredLayout).not.toBe(defAlgorithm)
    })

    it('is a no-op for an unknown engine or algorithm', () => {
      const state = createDefaultState()

      expect(removeAppAlgorithm(state, 'nope', 'nope::x')).toBe(state)
      expect(removeAppAlgorithm(state, 'cyjs', 'nope')).toBe(state)
    })
  })

  describe('removeAppEngine', () => {
    it('drops every algorithm of the app and resets a dangling preferred layout', () => {
      let state = createDefaultState()
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('two'),
        appApply,
      )
      state = setPreferredLayout(state, APP_ID, `${APP_ID}::two`)

      const result = removeAppEngine(state, APP_ID)

      expect(findEngine(result, APP_ID)).toBeUndefined()
      expect(result.preferredLayout).toBe(defAlgorithm)
      expect(result.preferredHierarchicalLayout).toBe(defHierarchicalAlgorithm)
    })

    it('never removes a built-in engine whose name equals the app id', () => {
      const state = createDefaultState()
      const builtIn = state.layoutEngines[0]
      const algorithmName = Object.keys(builtIn.algorithms)[0]

      expect(removeAppEngine(state, builtIn.name)).toBe(state)
      expect(removeAppAlgorithm(state, builtIn.name, algorithmName)).toBe(state)
    })

    it('is a no-op when the app has no engine', () => {
      const state = createDefaultState()
      expect(removeAppEngine(state, 'nope')).toBe(state)
    })
  })

  describe('setPreferredLayout with store-only engines', () => {
    it('resolves an app algorithm that exists only in the store state', () => {
      let state = createDefaultState()
      state = upsertAppAlgorithm(
        state,
        APP_ID,
        makeAppAlgorithm('one'),
        appApply,
      )

      const result = setPreferredLayout(state, APP_ID, `${APP_ID}::one`)

      expect(result.preferredLayout.name).toBe(`${APP_ID}::one`)
      expect(result.preferredLayout.engineName).toBe(APP_ID)
    })
  })

  describe('setLayoutOption on the preferred layout', () => {
    it('keeps preferredLayout pointing at the edited algorithm', () => {
      let state = createDefaultState()
      state = setPreferredLayout(state, 'cyjs', 'grid')

      const result = setLayoutOption(state, 'cyjs', 'grid', 'spacing', 100)

      expect(result.preferredLayout.parameters.spacing).toBe(100)
      expect(result.preferredLayout).toBe(
        result.layoutEngines.find((e) => e.name === 'cyjs')?.algorithms['grid'],
      )
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalLayoutEngines = original.layoutEngines
      const originalPreferredLayout = original.preferredLayout

      let state = setPreferredLayout(original, 'cyjs', 'grid')
      state = setIsRunning(state, true)
      state = setLayoutOption(state, 'cyjs', 'grid', 'spacing', 100)

      // The chained operations produce a new state object
      expect(state).not.toBe(original)

      // Verify original is unchanged
      expect(original.layoutEngines).toBe(originalLayoutEngines)
      expect(original.preferredLayout).toBe(originalPreferredLayout)
      expect(original.isRunning).toBe(false)
    })
  })
})
