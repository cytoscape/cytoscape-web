// src/app-api/event-bus/dispatchCyWebEvent.ts
// Minimal dispatch helper for Phase 1e — fires layout events on window.
// Full event bus (CyWebEvents interface, initEventBus) is implemented in Step 2.

/**
 * Dispatches a CustomEvent on `window` with the given type and detail payload.
 * Silently no-ops in environments without `window` (e.g., SSR, some test environments).
 */
export function dispatchCyWebEvent<K extends string>(
  eventType: K,
  detail?: Record<string, unknown>,
): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventType, { detail: detail ?? {} }))
  }
}
