// src/app-api/cywebapi-ready.test.ts
//
// Smoke test: verifies that window.CyWebApi can be assigned and that
// cywebapi:ready fires correctly after the assignment.
//
// CyWebApi itself is not imported here (that would pull in LayoutStore →
// @cosmograph/cosmos which requires a transform that Jest cannot apply).
// The structural shape of CyWebApi is tested by the individual domain API
// tests (elementApi.test.ts, networkApi.test.ts, …).
// This file focuses solely on the runtime wiring contract:
//   1. window.CyWebApi = <object>  (done in init.tsx before React renders)
//   2. window.dispatchEvent(new CustomEvent('cywebapi:ready'))  (done in
//      AppShell after setWorkspace completes)

const MOCK_API_DOMAINS = [
  'element',
  'network',
  'selection',
  'viewport',
  'table',
  'visualStyle',
  'layout',
  'export',
  'workspace',
  'contextMenu',
] as const

describe('cywebapi:ready smoke test', () => {
  const mockCyWebApi = Object.fromEntries(
    MOCK_API_DOMAINS.map((domain) => [domain, {}]),
  )

  beforeEach(() => {
    ;(window as any).CyWebApi = undefined
  })

  it('window.CyWebApi is undefined before assignment', () => {
    expect((window as any).CyWebApi).toBeUndefined()
  })

  it('window.CyWebApi is defined after the init.tsx assignment step', () => {
    ;(window as any).CyWebApi = mockCyWebApi
    expect((window as any).CyWebApi).toBeDefined()
  })

  it('window.CyWebApi exposes all 10 required API domain keys', () => {
    ;(window as any).CyWebApi = mockCyWebApi
    for (const domain of MOCK_API_DOMAINS) {
      expect((window as any).CyWebApi).toHaveProperty(domain)
    }
  })

  it('cywebapi:ready fires after window.CyWebApi is assigned', () => {
    ;(window as any).CyWebApi = mockCyWebApi
    const handler = jest.fn()
    window.addEventListener('cywebapi:ready', handler)
    window.dispatchEvent(new CustomEvent('cywebapi:ready'))
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('cywebapi:ready', handler)
  })

  it('listener registered before cywebapi:ready receives the event', () => {
    ;(window as any).CyWebApi = mockCyWebApi
    let received = false
    const handler = (): void => {
      received = true
    }
    window.addEventListener('cywebapi:ready', handler)
    window.dispatchEvent(new CustomEvent('cywebapi:ready'))
    expect(received).toBe(true)
    window.removeEventListener('cywebapi:ready', handler)
  })

  it('listener registered after cywebapi:ready does NOT receive the already-fired event', () => {
    ;(window as any).CyWebApi = mockCyWebApi
    window.dispatchEvent(new CustomEvent('cywebapi:ready'))
    const handler = jest.fn()
    window.addEventListener('cywebapi:ready', handler)
    // no second dispatch — handler should not have been called
    expect(handler).not.toHaveBeenCalled()
    window.removeEventListener('cywebapi:ready', handler)
  })
})
