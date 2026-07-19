// src/app-api/useCyWebEvent.ts
// Exposed as cyweb/EventBus

import { useEffect, useRef } from 'react'

import type { CyWebEvents } from './event-bus/CyWebEvents'

/**
 * React hook that subscribes to a typed CyWeb event dispatched on `window`.
 * The listener is automatically removed when the component unmounts.
 *
 * The handler is held in a ref, so passing a fresh inline function each
 * render does NOT re-register the window listener — the latest handler is
 * always invoked, and no events are missed during the re-subscribe gap
 * that identity-based re-registration would otherwise open. Callers need
 * not wrap the handler in `useCallback`.
 *
 * @param eventType - The event name (key of CyWebEvents)
 * @param handler   - Callback receiving the typed event detail
 *
 * @example
 * useCyWebEvent('selection:changed', ({ selectedNodes }) => {
 *   setCount(selectedNodes.length)
 * })
 */
export function useCyWebEvent<K extends keyof CyWebEvents>(
  eventType: K,
  handler: (detail: CyWebEvents[K]) => void,
): void {
  // Keep the latest handler in a ref so the listener identity is stable
  // across renders while still calling the current handler.
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const listener = (e: Event): void => {
      handlerRef.current((e as CustomEvent<CyWebEvents[K]>).detail)
    }
    window.addEventListener(eventType, listener)
    return () => {
      window.removeEventListener(eventType, listener)
    }
  }, [eventType])
}
