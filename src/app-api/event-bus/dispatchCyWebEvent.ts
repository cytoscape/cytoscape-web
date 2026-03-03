// src/app-api/event-bus/dispatchCyWebEvent.ts

import type { CyWebEvents } from './CyWebEvents'

/**
 * Type-safe helper for dispatching CyWeb events on window.
 * Used by initEventBus.ts (subscription-based events) and
 * core/layoutApi.ts (layout lifecycle events).
 *
 * This is the **only place** where `new CustomEvent` is called for CyWeb events.
 */
export function dispatchCyWebEvent<K extends keyof CyWebEvents>(
  type: K,
  detail: CyWebEvents[K],
): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(type, { detail }))
  }
}
