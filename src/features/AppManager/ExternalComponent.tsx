import { lazy } from 'react'

declare const __webpack_init_sharing__: (arg: string) => Promise<void> // Declare __webpack_init_sharing__ function
declare const __webpack_share_scopes__: any // Declare __webpack_share_scopes__ variable

// Cache of in-flight or completed remote entry loads to avoid duplicate <script> tags
const remoteEntryCache = new Map<string, Promise<void>>()

/**
 * Dynamically inject a <script> tag for a remote's remoteEntry.js and wait for
 * it to load.  Once the script executes, `window[scope]` will hold the webpack
 * container.  Results are cached so each URL is loaded at most once.
 */
export const loadRemoteEntry = (url: string, scope: string): Promise<void> => {
  // Already loaded – nothing to do
  if ((window as any)[scope]) {
    return Promise.resolve()
  }

  const cached = remoteEntryCache.get(scope)
  if (cached) {
    return cached
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.type = 'text/javascript'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error(`Failed to load remote entry: ${url}`))
    document.head.appendChild(script)
  })

  remoteEntryCache.set(scope, promise)
  return promise
}

/**
 * Initialise the sharing scope and return a module from the given container.
 * If the container is not yet available on `window`, `url` can be provided to
 * dynamically load the remote entry script first.
 */
const initAndGetModule = async (
  scope: string,
  module: string,
  url?: string,
) => {
  // Ensure the remote entry script is loaded
  if (!(window as any)[scope] && url) {
    await loadRemoteEntry(url, scope)
  }

  await __webpack_init_sharing__('default')
  const container = (window as any)[scope]
  if (!container) {
    throw new Error(
      `Container "${scope}" not found on window after loading remote entry`,
    )
  }
  await container.init(__webpack_share_scopes__.default)
  const factory = await container.get(module)
  const Module = factory()
  return Module
}

export const loadComponent = (scope: string, module: string) => {
  return async () => initAndGetModule(scope, module)
}

export const ExternalComponent = (scope: string, module: string) => {
  return lazy(loadComponent(scope, module))
}

/**
 * Load a federated module.  When `url` is provided the remote entry script
 * will be dynamically injected if the container is not already available.
 */
export const loadModule = async (
  scope: string,
  module: string,
  url?: string,
) => {
  return initAndGetModule(scope, module, url)
}

export default ExternalComponent
