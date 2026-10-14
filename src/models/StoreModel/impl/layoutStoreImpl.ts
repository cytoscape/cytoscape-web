import {
  defAlgorithm,
  defHierarchicalAlgorithm,
} from '../../LayoutModel/impl/layoutSelection'
import { LayoutAlgorithm } from '../../LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../LayoutModel/LayoutEngine'
import { ValueType } from '../../TableModel'

export interface LayoutState {
  layoutEngines: LayoutEngine[]
  preferredLayout: LayoutAlgorithm
  preferredHierarchicalLayout: LayoutAlgorithm
  isRunning: boolean
}

/**
 * Find an algorithm in the engines held by the state. Reads the state, not
 * the static `LayoutEngines` list, so engines added at run time (the
 * synthetic engines built for apps' 'layout-algorithm' resources) resolve
 * too.
 */
const findAlgorithm = (
  state: LayoutState,
  engineName: string,
  algorithmName: string,
): LayoutAlgorithm | undefined =>
  state.layoutEngines.find((engine) => engine.name === engineName)?.algorithms[
    algorithmName
  ]

/**
 * Set preferred layout
 */
export const setPreferredLayout = (
  state: LayoutState,
  engineName: string,
  algorithmName: string,
): LayoutState => {
  const algorithm = findAlgorithm(state, engineName, algorithmName)
  if (algorithm === undefined) {
    return state
  }

  return {
    ...state,
    preferredLayout: algorithm,
  }
}

/**
 * Set isRunning flag
 */
export const setIsRunning = (
  state: LayoutState,
  isRunning: boolean,
): LayoutState => {
  return {
    ...state,
    isRunning,
  }
}

/**
 * Set a layout option
 */
export const setLayoutOption = <T extends ValueType>(
  state: LayoutState,
  engineName: string,
  algorithmName: string,
  propertyName: string,
  propertyValue: T,
): LayoutState => {
  const engines = [...state.layoutEngines]
  const engineIndex = engines.findIndex(
    (engine: { name: string }) => engine.name === engineName,
  )

  if (engineIndex === -1) {
    return state
  }

  const engine = engines[engineIndex]
  const algorithm = engine.algorithms[algorithmName]

  if (algorithm === undefined) {
    return state
  }

  // Only a declared, editable parameter that already exists in the engine
  // record may change. The second guard matters: Cosmos declares editables
  // whose values live under `parameters.simulation`, and the antv runner
  // spreads every top-level key into the engine, so a stray key must never
  // be created here.
  const { parameters, editables } = algorithm
  const isEditable = (editables ?? []).some((e) => e.name === propertyName)
  if (!isEditable || parameters[propertyName] === undefined) {
    return state
  }

  const newParams = { ...parameters, [propertyName]: propertyValue }
  const newAlgorithm = {
    ...algorithm,
    parameters: newParams,
  }
  const newEngines = [...engines]
  newEngines[engineIndex] = {
    ...engine,
    algorithms: {
      ...engine.algorithms,
      [algorithmName]: newAlgorithm,
    },
  }

  // `preferredLayout` holds an algorithm object, so an edit to the algorithm
  // it points at must re-point it, or Apply Default Layout keeps running the
  // values from before the edit.
  const isPreferred =
    state.preferredLayout.engineName === engineName &&
    state.preferredLayout.name === algorithmName
  const isPreferredHierarchical =
    state.preferredHierarchicalLayout.engineName === engineName &&
    state.preferredHierarchicalLayout.name === algorithmName

  return {
    ...state,
    layoutEngines: newEngines,
    preferredLayout: isPreferred ? newAlgorithm : state.preferredLayout,
    preferredHierarchicalLayout: isPreferredHierarchical
      ? newAlgorithm
      : state.preferredHierarchicalLayout,
  }
}

// ── App engines ('layout-algorithm' resources) ──────────────────────────
//
// Each app that registers layout algorithms gets ONE synthetic engine, named
// after the app id and carrying `appId`. The impls find that engine by its
// `appId`, never by name alone, so an app id that equals a built-in engine's
// name can never be merged into, or remove, the built-in engine (the adapter
// refuses such an id anyway). Every impl here returns fresh arrays
// and objects: the initial `layoutEngines` is the module-level `LayoutEngines`
// array, and Immer deep-freezes it after the first store write, so an
// in-place push would throw.

/**
 * Add or replace an app algorithm, creating the app's engine on first use.
 */
export const upsertAppAlgorithm = (
  state: LayoutState,
  appId: string,
  algorithm: LayoutAlgorithm,
  apply: LayoutEngine['apply'],
): LayoutState => {
  const engines = [...state.layoutEngines]
  const engineIndex = engines.findIndex((engine) => engine.appId === appId)

  if (engineIndex === -1) {
    engines.push({
      name: appId,
      appId,
      description: `Layout algorithms registered by the app "${appId}"`,
      defaultAlgorithmName: algorithm.name,
      algorithms: { [algorithm.name]: algorithm },
      apply,
    })
  } else {
    const engine = engines[engineIndex]
    engines[engineIndex] = {
      ...engine,
      apply,
      algorithms: { ...engine.algorithms, [algorithm.name]: algorithm },
    }
  }

  // A re-registration (an app reloaded, or registerLayout called again)
  // replaces the algorithm object; a preferred layout that pointed at the
  // old one must follow, or Apply Default Layout keeps running stale
  // definitions.
  const matches = (preferred: LayoutAlgorithm): boolean =>
    preferred.engineName === appId && preferred.name === algorithm.name

  return {
    ...state,
    layoutEngines: engines,
    preferredLayout: matches(state.preferredLayout)
      ? algorithm
      : state.preferredLayout,
    preferredHierarchicalLayout: matches(state.preferredHierarchicalLayout)
      ? algorithm
      : state.preferredHierarchicalLayout,
  }
}

/**
 * Point a dangling preferred layout back at the built-in default. `removed`
 * is the set of algorithm names that no longer exist. The fallback is the
 * default's live object in `state.layoutEngines` (it carries the user's
 * parameter edits and is what Apply Default Layout must run), not the static
 * module constant; the constant is only the last resort.
 */
const resetDanglingPreferred = (
  state: LayoutState,
  removed: Set<string>,
): Pick<LayoutState, 'preferredLayout' | 'preferredHierarchicalLayout'> => {
  const live = (fallback: LayoutAlgorithm): LayoutAlgorithm =>
    findAlgorithm(state, fallback.engineName, fallback.name) ?? fallback
  return {
    preferredLayout: removed.has(state.preferredLayout.name)
      ? live(defAlgorithm)
      : state.preferredLayout,
    preferredHierarchicalLayout: removed.has(
      state.preferredHierarchicalLayout.name,
    )
      ? live(defHierarchicalAlgorithm)
      : state.preferredHierarchicalLayout,
  }
}

/**
 * Remove one app algorithm; the app's engine goes with it once empty.
 */
export const removeAppAlgorithm = (
  state: LayoutState,
  appId: string,
  algorithmName: string,
): LayoutState => {
  const engineIndex = state.layoutEngines.findIndex(
    (engine) => engine.appId === appId,
  )
  if (engineIndex === -1) {
    return state
  }
  const engine = state.layoutEngines[engineIndex]
  if (engine.algorithms[algorithmName] === undefined) {
    return state
  }

  const { [algorithmName]: _removed, ...remaining } = engine.algorithms
  const engines = [...state.layoutEngines]
  if (Object.keys(remaining).length === 0) {
    engines.splice(engineIndex, 1)
  } else {
    engines[engineIndex] = { ...engine, algorithms: remaining }
  }

  return {
    ...state,
    layoutEngines: engines,
    ...resetDanglingPreferred(state, new Set([algorithmName])),
  }
}

/**
 * Remove an app's engine and every algorithm in it.
 */
export const removeAppEngine = (
  state: LayoutState,
  appId: string,
): LayoutState => {
  const engine = state.layoutEngines.find((engine) => engine.appId === appId)
  if (engine === undefined) {
    return state
  }

  return {
    ...state,
    layoutEngines: state.layoutEngines.filter((e) => e !== engine),
    ...resetDanglingPreferred(state, new Set(Object.keys(engine.algorithms))),
  }
}
