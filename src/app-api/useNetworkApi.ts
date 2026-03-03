// src/app-api/useNetworkApi.ts

import { networkApi } from './core/networkApi'
import type { NetworkApi } from './core/networkApi'

export type { NetworkApi }
export const useNetworkApi = (): NetworkApi => networkApi
