// src/app-api/core/ready.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Each test re-imports the module fresh so the one-shot `ready` flag and
// the module-load window listener start clean.
async function freshReady() {
  vi.resetModules()
  return await import('./ready')
}

describe('ready signal', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('starts not-ready', async () => {
    const { isReady } = await freshReady()
    expect(isReady()).toBe(false)
  })

  it('markReady flips isReady and resolves pending whenReadySignal', async () => {
    const { isReady, markReady, whenReadySignal } = await freshReady()
    let resolved = false
    const p = whenReadySignal().then(() => {
      resolved = true
    })
    expect(isReady()).toBe(false)
    expect(resolved).toBe(false)

    markReady()
    await p
    expect(isReady()).toBe(true)
    expect(resolved).toBe(true)
  })

  it('whenReadySignal resolves immediately when already ready', async () => {
    const { markReady, whenReadySignal } = await freshReady()
    markReady()
    await expect(whenReadySignal()).resolves.toBeUndefined()
  })

  it('markReady is idempotent', async () => {
    const { markReady, isReady } = await freshReady()
    markReady()
    markReady()
    expect(isReady()).toBe(true)
  })

  it('resolves when the cywebapi:ready window event fires', async () => {
    const { isReady, whenReadySignal } = await freshReady()
    const p = whenReadySignal()
    window.dispatchEvent(new CustomEvent('cywebapi:ready'))
    await p
    expect(isReady()).toBe(true)
  })
})
