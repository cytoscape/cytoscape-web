import { ComponentType, lazy } from 'react'

import { logApp } from '../../debug'

const lazyComponentCache = new Map<string, ReturnType<typeof lazy>>()

const DisabledExternalComponent: ComponentType = () => null

/**
 * External remote loading is disabled in the standalone build.
 */
export const loadRemoteEntry = async (
  url: string,
  scope: string,
): Promise<void> => {
  logApp.warn(
    `[ExternalComponent]: Ignoring remote entry "${scope}" from ${url} because standalone mode disables external apps`,
  )
}

export const loadComponent = (scope: string, module: string) => {
  return async () => {
    logApp.warn(
      `[ExternalComponent]: Ignoring external component request "${scope}/${module}" because standalone mode disables external apps`,
    )

    return {
      default: DisabledExternalComponent,
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
 * External modules are not available in the standalone build.
 */
export const loadModule = async (
  scope: string,
  module: string,
  url?: string,
) => {
  logApp.warn(
    `[ExternalComponent]: Ignoring external module request "${scope}/${module}" from ${url ?? 'unknown url'} because standalone mode disables external apps`,
  )
  return undefined
}

export default ExternalComponent
