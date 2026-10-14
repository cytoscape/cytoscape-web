// src/app-api/useNetworkApi.ts

import type { NetworkApi } from './core/networkApi'
import { networkApi } from './core/networkApi'

export type { NetworkApi }
export const useNetworkApi = (): NetworkApi => networkApi
