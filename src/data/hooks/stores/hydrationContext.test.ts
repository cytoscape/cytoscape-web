// @vitest-environment node
import { describe, expect, it, beforeEach } from 'vitest'
import { isHydrating, setHydrating } from './hydrationContext'

describe('hydrationContext', () => {
  beforeEach(() => {
    // Reset state before each test
    // We have to force it to 0 by decrementing until it's false
    while (isHydrating()) {
      setHydrating(false)
    }
  })

  it('initially returns false', () => {
    expect(isHydrating()).toBe(false)
  })

  it('returns true when hydrating is set to true', () => {
    setHydrating(true)
    expect(isHydrating()).toBe(true)
  })

  it('handles concurrent hydration calls via a counter', () => {
    setHydrating(true) // count = 1
    expect(isHydrating()).toBe(true)

    setHydrating(true) // count = 2
    expect(isHydrating()).toBe(true)

    setHydrating(false) // count = 1
    expect(isHydrating()).toBe(true) // Should still be true!

    setHydrating(false) // count = 0
    expect(isHydrating()).toBe(false) // Now it should be false
  })

  it('does not decrement below zero', () => {
    setHydrating(false)
    setHydrating(false)
    setHydrating(false)

    // Counter should be 0, not -3. If it was -3, then one setHydrating(true) would leave it at -2 (still false).
    setHydrating(true)
    expect(isHydrating()).toBe(true)
  })
})
