import { createContext } from 'react'

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
  payload?: any
}

export const initialState: FeatureAvailabilityState = {
  isCyDeskAvailable: false,
  isSafari: false,
}

export const FeatureAvailabilityContext = createContext<{
  state: FeatureAvailabilityState
  tooltip: string
}>({ state: initialState, tooltip: '' })
