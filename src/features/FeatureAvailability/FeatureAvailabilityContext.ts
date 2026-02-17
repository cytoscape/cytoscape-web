import { createContext } from 'react'

export type PermissionState = 'prompt' | 'granted' | 'denied'

export type FeatureAvailabilityState = {
  isCyDeskAvailable: boolean
  isSafari: boolean
}

export const FeatureAvailabilityActionType = {
  SET_CYDESK_AVAILABLE: 'SET_CYDESK_AVAILABLE',
  SET_CYDESK_UNAVAILABLE: 'SET_CYDESK_UNAVAILABLE',
  SET_IS_SAFARI: 'SET_IS_SAFARI',
  SET_NOT_SAFARI: 'SET_IS_NOT_SAFARI',
} as const

export type FeatureAvailabilityActionType =
  (typeof FeatureAvailabilityActionType)[keyof typeof FeatureAvailabilityActionType]

export type FeatureAvailabilityAction = {
  type: FeatureAvailabilityActionType
  // payload is not currently used but reserved for future extensibility
  payload?: unknown
}

export const initialState: FeatureAvailabilityState = {
  isCyDeskAvailable: false,
  isSafari: false,
}

import { PollingStartResult } from './useFeatureAvailabilityPolling'

export const FeatureAvailabilityContext = createContext<{
  state: FeatureAvailabilityState
  tooltip: string
  startPolling: () => Promise<PollingStartResult>
  stopPolling: () => void
  checkPermission: () => Promise<PermissionState | null>
}>({
  state: initialState,
  tooltip: '',
  startPolling: async () => ({ canAccessEndpoint: false }),
  stopPolling: () => {},
  checkPermission: async () => null,
})
