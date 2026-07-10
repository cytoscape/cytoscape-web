import {
  loadRemote as mfLoadRemote,
  registerRemotes as mfRegisterRemotes,
} from '@module-federation/runtime'
import { ComponentType, lazy } from 'react'

import { logApp } from '../../debug'

const lazyComponentCache = new Map<string, ReturnType<typeof lazy>>()

// scope -> currently-registered remoteEntry URL, so we only (re)register a
// remote when its URL actually changes.
const registeredRemotes = new Map<string, string>()

const DisabledExternalComponent: ComponentType = () => null

// We deliberately use the GLOBAL Module Federation runtime functions (rather
// than createInstance) so external apps are loaded through the very same host
// instance that @module-federation/vite initializes at startup. That instance
// is ESM-aware: it imports modern remoteEntry.js bundles as ES modules. A fresh
// createInstance() would default to classic-script injection and choke on the
// `import` statements in a Vite-built remote.
//
// Indirected through a mutable binding so tests can substitute fakes.
type FederationRuntime = {
  registerRemotes: typeof mfRegisterRemotes
  loadRemote: typeof mfLoadRemote
}

const defaultRuntime: FederationRuntime = {
  registerRemotes: mfRegisterRemotes,
  loadRemote: mfLoadRemote,
}

let runtime: FederationRuntime = defaultRuntime

/** Test seam: substitute a fake Module Federation runtime. */
export const __setRuntime = (fake: FederationRuntime): void => {
  runtime = fake
}

/** Test seam: reset the runtime, registry, and component cache. */
export const __resetRemoteState = (): void => {
  runtime = defaultRuntime
  registeredRemotes.clear()
  lazyComponentCache.clear()
}

/**
 * Ensure a remote is registered with the federation runtime under `scope`,
 * pointing at `url`. Idempotent per scope+url; re-registers (force) when the
 * URL changes.
 */
const ensureRemoteRegistered = (scope: string, url: string): void => {
  if (registeredRemotes.get(scope) === url) {
    return
  }
  if (registeredRemotes.has(scope)) {
    logApp.warn(
      `[ExternalComponent]: Replacing remote entry for "${scope}" from ${registeredRemotes.get(
        scope,
      )} to ${url}`,
    )
  }
  // `type: 'module'` tells the runtime to import() the remoteEntry as an ES
  // module (loadEsmEntry) rather than inject a classic <script>, which is
  // required for modern @module-federation/vite (ESM) remotes.
  runtime.registerRemotes([{ name: scope, entry: url, type: 'module' }], {
    force: true,
  })
  registeredRemotes.set(scope, url)
}

/**
 * Register (and, on first use, load) a remote's `remoteEntry.js` via the
 * Module Federation runtime. Kept for API compatibility; loadModule registers
 * lazily, so callers rarely need this directly.
 */
export const loadRemoteEntry = async (
  url: string,
  scope: string,
): Promise<void> => {
  ensureRemoteRegistered(scope, url)
}

export const loadComponent = (scope: string, module: string) => {
  return async () => {
    try {
      const componentModule = await loadModule(scope, module)
      const component =
        typeof componentModule === 'object' &&
        componentModule !== null &&
        'default' in componentModule
          ? (componentModule.default as ComponentType)
          : (componentModule as ComponentType)

      return {
        default: component,
      }
    } catch (error) {
      logApp.warn(
        `[ExternalComponent]: Failed to load external component "${scope}/${module}":`,
        error,
      )

      return {
        default: DisabledExternalComponent,
      }
    }
  }
}

export const ExternalComponent = (scope: string, module: string) => {
  const key = `${scope}::${module}`
  const cached = lazyComponentCache.get(key)
  if (cached !== undefined) {
    return cached
  }
  const component = lazy(loadComponent(scope, module))
  lazyComponentCache.set(key, component)
  return component
}

/**
 * Load a remote exposed module through the Module Federation runtime.
 *
 * `module` is the `cyweb/`-style expose path (e.g. `'./AppConfig'`); the
 * runtime addresses modules as `<scope>/<expose>` (e.g. `testApp/AppConfig`).
 */
export const loadModule = async (
  scope: string,
  module: string,
  url?: string,
): Promise<unknown> => {
  const resolvedUrl = url ?? registeredRemotes.get(scope)
  if (resolvedUrl === undefined) {
    throw new Error(`Missing remote entry URL for module "${scope}/${module}"`)
  }

  ensureRemoteRegistered(scope, resolvedUrl)

  const exposeName = module.replace(/^\.\//, '')
  const remoteId = `${scope}/${exposeName}`
  const loaded = await runtime.loadRemote(remoteId)
  if (loaded === null || loaded === undefined) {
    throw new Error(
      `Failed to load remote module "${remoteId}" from ${resolvedUrl}`,
    )
  }
  return loaded
}

export default ExternalComponent
