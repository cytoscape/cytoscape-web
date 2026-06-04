import { ComponentType, lazy } from 'react'

import { logApp } from '../../debug'

const lazyComponentCache = new Map<string, ReturnType<typeof lazy>>()
const remoteEntryCache = new Map<string, Promise<void>>()
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

const getContainer = (scope: string): RemoteContainer | undefined => {
  const remoteWindow = window as unknown as Record<string, unknown>
  return remoteWindow[scope] as RemoteContainer | undefined
}

const initializeContainer = async (
  scope: string,
  container: RemoteContainer,
): Promise<void> => {
  const existingPromise = remoteInitCache.get(scope)
  if (existingPromise !== undefined) {
    return existingPromise
  }

  const initPromise = Promise.resolve(container.init(remoteShareScope.default))
    .catch((error: unknown) => {
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
 * Load a remote Module Federation entry and cache the initialized container.
 */
export const loadRemoteEntry = async (
  url: string,
  scope: string,
): Promise<void> => {
  const cacheKey = getRemoteCacheKey(scope, url)
  const cachedPromise = remoteEntryCache.get(cacheKey)
  if (cachedPromise !== undefined) {
    return cachedPromise
  }

  const previousUrl = remoteEntryUrlCache.get(scope)
  if (previousUrl !== undefined && previousUrl !== url) {
    logApp.warn(
      `[ExternalComponent]: Replacing remote entry for "${scope}" from ${previousUrl} to ${url}`,
    )
  }

  const remotePromise = new Promise<void>((resolve, reject) => {
    const existingContainer = getContainer(scope)
    if (existingContainer !== undefined) {
      void initializeContainer(scope, existingContainer)
        .then(() => resolve())
        .catch(reject)
      return
    }

    if (typeof document === 'undefined') {
      reject(new Error('Remote entries can only be loaded in a browser'))
      return
    }

    const remoteScript = document.createElement('script')
    remoteScript.src = url
    remoteScript.type = 'text/javascript'
    remoteScript.async = true
    remoteScript.dataset.remoteScope = scope

    remoteScript.onload = () => {
      const container = getContainer(scope)
      if (container === undefined) {
        reject(
          new Error(
            `Remote entry "${scope}" loaded from ${url} did not register a container`,
          ),
        )
        return
      }

      remoteContainerCache.set(cacheKey, Promise.resolve(container))
      void initializeContainer(scope, container)
        .then(() => resolve())
        .catch(reject)
    }

    remoteScript.onerror = () => {
      reject(new Error(`Failed to load remote entry "${scope}" from ${url}`))
    }

    document.head.appendChild(remoteScript)
  }).catch((error) => {
    remoteEntryCache.delete(cacheKey)
    remoteContainerCache.delete(cacheKey)
    if (remoteEntryUrlCache.get(scope) === url) {
      remoteEntryUrlCache.delete(scope)
    }
    throw error
  })

  remoteEntryCache.set(cacheKey, remotePromise)
  remoteEntryUrlCache.set(scope, url)
  return remotePromise
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
    throw new Error(
      `Missing remote entry URL for module "${scope}/${module}"`,
    )
  }

  await loadRemoteEntry(resolvedUrl, scope)
  const cacheKey = getRemoteCacheKey(scope, resolvedUrl)
  const containerPromise =
    remoteContainerCache.get(cacheKey) ?? Promise.resolve(getContainer(scope))
  const container = await containerPromise

  if (container === undefined) {
    throw new Error(`Remote container "${scope}" is not available`)
  }

  const factory = await container.get(module)
  return factory()
}

export default ExternalComponent
