import React, {
  useContext,
  useEffect,
  useReducer,
  ReactNode,
  useMemo,
} from 'react'
import {
  initialState,
  FeatureAvailabilityState,
  FeatureAvailabilityActionType,
  FeatureAvailabilityAction,
  FeatureAvailabilityContext,
} from './FeatureAvailabilityContext'

const END_POINT = 'http://127.0.0.1:1234/v1/version'
const POLLING_INTERVAL = 5000
const reducer = (
  state: FeatureAvailabilityState,
  action: FeatureAvailabilityAction,
): FeatureAvailabilityState => {
  switch (action.type) {
    case FeatureAvailabilityActionType.SET_CYDESK_AVAILABLE:
      return { ...state, isCyDeskAvailable: true }
    case FeatureAvailabilityActionType.SET_CYDESK_UNAVAILABLE:
      return { ...state, isCyDeskAvailable: false }
    case FeatureAvailabilityActionType.SET_IS_SAFARI:
      return { ...state, isSafari: true }
    case FeatureAvailabilityActionType.SET_NOT_SAFARI:
      return { ...state, isSafari: false }
    default:
      return state
  }
}

export const FeatureAvailabilityProvider: React.FC<{
  children: ReactNode
}> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const pollAvailability = async (abortController: AbortController) => {
    try {
      const response = await fetch(END_POINT, {
        signal: abortController.signal,
      })
      if (response.ok) {
        dispatch({
          type: FeatureAvailabilityActionType.SET_CYDESK_AVAILABLE,
        })
      } else {
        dispatch({ type: FeatureAvailabilityActionType.SET_CYDESK_UNAVAILABLE })
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        dispatch({ type: FeatureAvailabilityActionType.SET_CYDESK_UNAVAILABLE })
      }
    }
  }

  const tooltip = useMemo(() => {
    if (state.isSafari) {
      return 'This feature is not available in Safari.'
    }
    if (!state.isCyDeskAvailable) {
      return 'To use this feature, you need Cytoscape running 3.8.0 or higher on your machine (default port 1234).'
    }
    return 'Open a copy of the current network in Cytoscape Desktop.'
  }, [state.isSafari, state.isCyDeskAvailable])

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    const isSafari = ua.includes('safari') && !ua.includes('chrome')
    dispatch({
      type: isSafari
        ? FeatureAvailabilityActionType.SET_IS_SAFARI
        : FeatureAvailabilityActionType.SET_NOT_SAFARI,
    })
    if (isSafari) {
      return
    }
    const abortController = new AbortController()

    const intervalId = setInterval(() => {
      pollAvailability(abortController)
    }, POLLING_INTERVAL)

    return () => {
      clearInterval(intervalId)
      abortController.abort()
    }
  }, [])

  return (
    <FeatureAvailabilityContext.Provider value={{ state, tooltip }}>
      {children}
    </FeatureAvailabilityContext.Provider>
  )
}

export const useFeatureAvailability = () =>
  useContext(FeatureAvailabilityContext)
