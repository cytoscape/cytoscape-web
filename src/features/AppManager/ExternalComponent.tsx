import { ComponentType, lazy } from 'react'

import { logApp } from '../../debug'

const lazyComponentCache = new Map<string, ReturnType<typeof lazy>>()
const remoteEntryUrlCache = new Map<string, string>()
const remoteContainerCache = new Map<string, Promise<RemoteContainer>>()
const remoteInitCache = new Map<string, Promise<void>>()

const DisabledExternalComponent: ComponentType = () => null

type RemoteContainer = {
  init: (shareScope: unknown) => Promise<void> | void
  get: (module: string) => Promise<() => unknown> | (() => unknown)
}

const getRemoteCacheKey = (scope: string, url: string): string =>
  `${scope}::${url}`

const remoteShareScope = { default: {} }

/**
 * Imports a remote `remoteEntry.js` as an ES module and returns its namespace.
 *
 * Modern Module Federation remotes (e.g. `@module-federation/vite`) emit an ESM
 * `remoteEntry.js` whose namespace exports the federation container contract
 * (`init` / `get`). We load it with a dynamic `import()` — `@vite-ignore` keeps
 * the host's own bundler from trying to resolve this runtime URL at build time.
 *
 * Indirected through a module-level binding so unit tests can substitute a fake
 * importer (real dynamic import of an arbitrary URL is not feasible in jsdom).
 */
let importRemoteEntry = (url: string): Promise<unknown> =>
  import(/* @vite-ignore */ url)

/** Test seam: override the remote-entry importer. */
export const __setImportRemoteEntry = (
  importer: (url: string) => Promise<unknown>,
): void => {
  importRemoteEntry = importer
}

/** Test seam: restore the real dynamic-import importer and clear caches. */
export const __resetRemoteState = (): void => {
  importRemoteEntry = (url: string) => import(/* @vite-ignore */ url)
  lazyComponentCache.clear()
  remoteEntryUrlCache.clear()
  remoteContainerCache.clear()
  remoteInitCache.clear()
}

const isRemoteContainer = (value: unknown): value is RemoteContainer =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RemoteContainer).init === 'function' &&
  typeof (value as RemoteContainer).get === 'function'

const initializeContainer = async (
  scope: string,
  container: RemoteContainer,
): Promise<void> => {
  const existingPromise = remoteInitCache.get(scope)
  if (existingPromise !== undefined) {
    return existingPromise
  }

  const initPromise = Promise.resolve(
    container.init(remoteShareScope.default),
  ).catch((error: unknown) => {
    if (
      error instanceof Error &&
      /already been initialized|already initialized/i.test(error.message)
    ) {
      return
    }

    remoteInitCache.delete(scope)
    throw error
  })

  remoteInitCache.set(scope, initPromise)
  return initPromise
}

/**
 * Load and initialize a remote Module Federation container from its ESM
 * `remoteEntry.js`. The initialized container is cached per scope+url.
 */
export const loadRemoteEntry = async (
  url: string,
  scope: string,
): Promise<RemoteContainer> => {
  const cacheKey = getRemoteCacheKey(scope, url)
  const cachedPromise = remoteContainerCache.get(cacheKey)
  if (cachedPromise !== undefined) {
    return cachedPromise
  }

  const previousUrl = remoteEntryUrlCache.get(scope)
  if (previousUrl !== undefined && previousUrl !== url) {
    logApp.warn(
      `[ExternalComponent]: Replacing remote entry for "${scope}" from ${previousUrl} to ${url}`,
    )
  }

  const containerPromise = (async (): Promise<RemoteContainer> => {
    const namespace = await importRemoteEntry(url)
    if (!isRemoteContainer(namespace)) {
      throw new Error(
        `Remote entry "${scope}" loaded from ${url} does not export a Module Federation container (init/get)`,
      )
    }

    await initializeContainer(scope, namespace)
    return namespace
  })().catch((error) => {
    remoteContainerCache.delete(cacheKey)
    if (remoteEntryUrlCache.get(scope) === url) {
      remoteEntryUrlCache.delete(scope)
    }
    throw error
  })

  remoteContainerCache.set(cacheKey, containerPromise)
  remoteEntryUrlCache.set(scope, url)
  return containerPromise
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
 * Load a remote exposed module after ensuring the remote container exists.
 */
export const loadModule = async (
  scope: string,
  module: string,
  url?: string,
) => {
  const resolvedUrl = url ?? remoteEntryUrlCache.get(scope)
  if (resolvedUrl === undefined) {
    throw new Error(`Missing remote entry URL for module "${scope}/${module}"`)
  }

  const container = await loadRemoteEntry(resolvedUrl, scope)
  const factory = await container.get(module)
  return factory()
}

export default ExternalComponent
