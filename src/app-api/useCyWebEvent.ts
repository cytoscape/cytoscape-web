// src/app-api/useCyWebEvent.ts
// Exposed as cyweb/EventBus

import { useEffect } from 'react'

import type { CyWebEvents } from './event-bus/CyWebEvents'

/**
 * React hook that subscribes to a typed CyWeb event dispatched on `window`.
 * The listener is automatically removed when the component unmounts.
 *
 * @param eventType - The event name (key of CyWebEvents)
 * @param handler   - Callback receiving the typed event detail
 *
 * @example
 * const handleSelection = useCallback(({ selectedNodes }) => {
 *   setCount(selectedNodes.length)
 * }, [])
 *
 * useCyWebEvent('selection:changed', handleSelection)
 */
export function useCyWebEvent<K extends keyof CyWebEvents>(
  eventType: K,
  handler: (detail: CyWebEvents[K]) => void,
): void {
  useEffect(() => {
    const listener = (e: Event): void => {
      handler((e as CustomEvent<CyWebEvents[K]>).detail)
    }
    window.addEventListener(eventType, listener)
    return () => {
      window.removeEventListener(eventType, listener)
    }
  }, [eventType, handler])
}
