// src/app-api/core/appLayoutEngine.ts
//
// Adapts an app's registerLayout() options into the host's LayoutEngine
// contract, so a registered algorithm is an ordinary entry in
// LayoutStore.layoutEngines: the Layout menu, the Settings dialog, Apply
// Default Layout and layout.applyLayout() all reach it with no special case.
//
// One synthetic engine per app, named after the app id (LayoutStore owns
// it); one shared `apply` for every app engine, which dispatches on the
// qualified algorithm name `<appId>::<id>` through the registry below. The
// run functions live here rather than in the store because the store state
// is Immer-frozen and serialized into snapshots, and because a run needs the
// app's per-app API object, which only core/ can build.
//
// Framework-agnostic: no React imports; stores via .getState().

import { registerAppCleanup } from '../../data/hooks/stores/AppCleanupRegistry'
import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { logApi } from '../../debug'
import type { IdType } from '../../models/IdType'
import type { LayoutAlgorithm } from '../../models/LayoutModel/LayoutAlgorithm'
import { LayoutAlgorithmType } from '../../models/LayoutModel/LayoutAlgorithm'
import type { LayoutEngine } from '../../models/LayoutModel/LayoutEngine'
import type { Property } from '../../models/PropertyModel/Property'
import type { ValueType } from '../../models/TableModel'
import type { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import type { AppContextApis } from '../types/AppContext'
import type {
  LayoutPositions,
  LayoutRunContext,
  RegisterLayoutOptions,
} from '../types/AppResourceTypes'
import { buildPerAppApis } from './perAppApis'

/** What the host keeps per registered algorithm, keyed by qualified name. */
interface AppLayoutEntry {
  readonly appId: string
  /** Slot-local id, as passed to registerLayout(). */
  readonly id: string
  readonly run: RegisterLayoutOptions['run']
  readonly isEnabled?: RegisterLayoutOptions['isEnabled']
}

const registry = new Map<string, AppLayoutEntry>()

/** The algorithm name the host uses everywhere for an app layout. */
export const qualifiedLayoutName = (appId: string, id: string): string =>
  `${appId}::${id}`

/**
 * Build the internal algorithm record. `parameters` holds the current
 * values, `editables` the Settings-dialog descriptors; they share their keys,
 * which is what `layoutStoreImpl.setLayoutOption` requires to update both.
 */
export function buildAppLayoutAlgorithm(
  appId: string,
  options: RegisterLayoutOptions,
): LayoutAlgorithm {
  const parameters: Record<string, ValueType> = {}
  const editables: Record<string, Property<ValueType>> = {}
  for (const [name, param] of Object.entries(options.parameters ?? {})) {
    parameters[name] = param.defaultValue
    editables[name] = {
      name,
      displayName: param.displayName,
      description: param.description,
      // LayoutParameterType is the scalar subset of ValueTypeName
      type: param.type as ValueTypeName,
      value: param.defaultValue,
      defaultValue: param.defaultValue,
      range: param.range,
    }
  }

  return {
    name: qualifiedLayoutName(appId, options.id),
    engineName: appId,
    displayName: options.displayName,
    description: options.description ?? '',
    type: options.type ?? LayoutAlgorithmType.other,
    threshold: options.threshold,
    parameters,
    editables: Object.keys(editables).length > 0 ? editables : undefined,
  }
}

const isPosition = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number' &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1])

/**
 * The `apply` shared by every app engine. Builds the run context, calls the
 * app's `run`, validates what comes back and hands it to `afterLayout`.
 *
 * Every failure is a rejected promise (after `logApi.error`) and never
 * reaches `afterLayout`, so no positions change and no undo entry is
 * recorded. Callers own the `isRunning` reset — the same contract
 * `layoutApi.applyLayout` already applies to async built-in engines.
 */
export const appEngineApply: LayoutEngine['apply'] = async (
  nodes,
  edges,
  afterLayout,
  algorithm,
  networkId,
): Promise<void> => {
  const name = algorithm.name
  try {
    const entry = registry.get(name)
    if (entry === undefined) {
      throw new Error(`Layout algorithm '${name}' is not registered`)
    }
    if (networkId === undefined || networkId === '') {
      throw new Error(`Layout '${name}' needs the id of the network to lay out`)
    }
    const viewModel = useViewModelStore.getState().getViewModel(networkId)
    if (viewModel === undefined) {
      throw new Error(`Network '${networkId}' has no view to lay out`)
    }

    const positions: LayoutPositions = {}
    for (const [nodeId, nodeView] of Object.entries(
      viewModel.nodeViews ?? {},
    )) {
      positions[nodeId] = [nodeView.x, nodeView.y]
    }

    const context: LayoutRunContext = {
      networkId,
      nodes,
      edges,
      positions,
      selectedNodeIds: [...(viewModel.selectedNodes ?? [])],
      parameters: { ...algorithm.parameters },
      apis: buildPerAppApis(entry.appId),
    }

    const result = await entry.run(context)

    // The app may have been disabled while `run` was pending: its cleanup
    // ran before its unmount(), so the registry no longer holds this entry.
    if (registry.get(name) !== entry) {
      throw new Error(
        `Layout '${name}' was unregistered while running; its result is discarded`,
      )
    }

    if (result === null || typeof result !== 'object') {
      throw new Error(
        `Layout '${name}' must return an object of node positions, got ${typeof result}`,
      )
    }
    const known = new Set<IdType>(nodes.map((node) => node.id))
    const positionMap = new Map<IdType, [number, number]>()
    let dropped = 0
    for (const [nodeId, position] of Object.entries(result)) {
      if (!known.has(nodeId) || !isPosition(position)) {
        dropped += 1
        continue
      }
      positionMap.set(nodeId, [position[0], position[1]])
    }
    if (dropped > 0) {
      logApi.warn(
        `[appLayoutEngine]: Layout '${name}' returned ${dropped} entr${dropped === 1 ? 'y' : 'ies'} that are not nodes of '${networkId}' or not [x, y] pairs; ignored`,
      )
    }

    afterLayout(positionMap)
  } catch (e) {
    logApi.error(`[appLayoutEngine]: Layout '${name}' failed:`, e)
    throw e
  }
}

/** Register (or replace) one app algorithm in the host's layout store. */
export function registerAppLayout(
  appId: string,
  options: RegisterLayoutOptions,
): void {
  const algorithm = buildAppLayoutAlgorithm(appId, options)
  registry.set(algorithm.name, {
    appId,
    id: options.id,
    run: options.run,
    isEnabled: options.isEnabled,
  })
  useLayoutStore.getState().upsertAppAlgorithm(appId, algorithm, appEngineApply)
}

/** Remove one app algorithm. No-op when it is not registered. */
export function unregisterAppLayout(appId: string, id: string): void {
  const name = qualifiedLayoutName(appId, id)
  if (registry.delete(name)) {
    useLayoutStore.getState().removeAppAlgorithm(appId, name)
  }
}

/** Remove every algorithm of an app, and its engine. */
export function unregisterAllAppLayouts(appId: string): void {
  let found = false
  for (const [name, entry] of registry) {
    if (entry.appId === appId) {
      registry.delete(name)
      found = true
    }
  }
  if (found) {
    useLayoutStore.getState().removeAppEngine(appId)
  }
}

/** The owning app and slot-local id of a qualified algorithm name. */
export function getAppLayoutMeta(
  algorithmName: string,
): { appId: string; id: string } | undefined {
  const entry = registry.get(algorithmName)
  return entry === undefined ? undefined : { appId: entry.appId, id: entry.id }
}

/**
 * The app's `isEnabled` snapshot for the Layout menu. Unregistered → false;
 * no hook → true; a throwing hook is logged and treated as false, like the
 * 'apps-menu' one.
 */
export function isAppLayoutEnabled(
  algorithmName: string,
  apis: AppContextApis,
): boolean {
  const entry = registry.get(algorithmName)
  if (entry === undefined) return false
  if (typeof entry.isEnabled !== 'function') return true
  try {
    return entry.isEnabled(apis) === true
  } catch (e) {
    logApi.error(`[appLayoutEngine]: isEnabled() threw for ${algorithmName}`, e)
    return false
  }
}

// Deactivation, uninstall and a failed mount() all funnel through
// cleanupAllForApp(appId); this makes app layouts part of that sweep.
registerAppCleanup((appId) => unregisterAllAppLayouts(appId))
