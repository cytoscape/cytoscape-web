import { lazy } from 'react'

declare const __webpack_init_sharing__: (arg: string) => Promise<void> // Declare __webpack_init_sharing__ function
declare const __webpack_share_scopes__: any // Declare __webpack_share_scopes__ variable

export const loadComponent = (scope: string, module: string) => {
  return async () => {
    await __webpack_init_sharing__('default')
    const container = window[scope as keyof Window]
    await container.init(__webpack_share_scopes__.default)
    const factory = await container.get(module)
    const Module = factory()
    return Module
  }
}

const ExternalComponent = (scope: string, module: string) => {
  return lazy(loadComponent(scope, module))
}

export const loadModule = async (scope: string, module: string) => {
  await __webpack_init_sharing__('default')
  const container = window[scope as keyof Window]
  await container.init(__webpack_share_scopes__.default)
  const factory = await container.get(module)
  const Module = factory()
  return Module
}

export default ExternalComponent
