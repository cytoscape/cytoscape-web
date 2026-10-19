// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  detectWebGPUSupport,
  getWebGPUSupport,
  INSECURE_CONTEXT_REASON,
  NO_ADAPTER_REASON,
  NO_WEBGPU_REASON,
  resetWebGPUSupportCache,
} from './webgpu'

const adapter = (features: string[], info?: object) => ({
  features: new Set(features),
  info,
})

describe('detectWebGPUSupport', () => {
  it('reports an insecure page before looking for a GPU', async () => {
    const requestAdapter = vi.fn()
    await expect(
      detectWebGPUSupport({ isSecureContext: false, gpu: { requestAdapter } }),
    ).resolves.toEqual({ supported: false, reason: INSECURE_CONTEXT_REASON })
    expect(requestAdapter).not.toHaveBeenCalled()
  })

  it('reports a browser without the WebGPU API', async () => {
    await expect(
      detectWebGPUSupport({ isSecureContext: true }),
    ).resolves.toEqual({ supported: false, reason: NO_WEBGPU_REASON })
  })

  it('treats the API without an adapter as unsupported', async () => {
    await expect(
      detectWebGPUSupport({
        isSecureContext: true,
        gpu: { requestAdapter: async () => null },
      }),
    ).resolves.toEqual({ supported: false, reason: NO_ADAPTER_REASON })
  })

  it('treats a failing adapter request as unsupported', async () => {
    await expect(
      detectWebGPUSupport({
        isSecureContext: true,
        gpu: {
          requestAdapter: async () => {
            throw new Error('GPU process crashed')
          },
        },
      }),
    ).resolves.toEqual({ supported: false, reason: NO_ADAPTER_REASON })
  })

  it('reports shader-f16 support and the adapter name', async () => {
    await expect(
      detectWebGPUSupport({
        isSecureContext: true,
        gpu: {
          requestAdapter: async () =>
            adapter(['shader-f16'], { vendor: 'apple', description: 'M3' }),
        },
      }),
    ).resolves.toEqual({ supported: true, shaderF16: true, adapterName: 'M3' })
  })

  it('falls back to the vendor, then a generic name', async () => {
    await expect(
      detectWebGPUSupport({
        isSecureContext: true,
        gpu: {
          requestAdapter: async () =>
            adapter([], { vendor: 'intel', description: '' }),
        },
      }),
    ).resolves.toEqual({
      supported: true,
      shaderF16: false,
      adapterName: 'intel',
    })
    await expect(
      detectWebGPUSupport({
        isSecureContext: true,
        gpu: { requestAdapter: async () => adapter([]) },
      }),
    ).resolves.toMatchObject({ adapterName: 'WebGPU' })
  })
})

describe('getWebGPUSupport', () => {
  afterEach(() => {
    resetWebGPUSupportCache()
    vi.unstubAllGlobals()
  })

  it('runs the check once per session', async () => {
    const requestAdapter = vi.fn(async () => adapter(['shader-f16']))
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { gpu: { requestAdapter } })

    const first = await getWebGPUSupport()
    const second = await getWebGPUSupport()

    expect(first).toEqual(second)
    expect(first.supported).toBe(true)
    expect(requestAdapter).toHaveBeenCalledTimes(1)
  })

  it('reports no WebGPU where navigator has no gpu', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', {})
    await expect(getWebGPUSupport()).resolves.toEqual({
      supported: false,
      reason: NO_WEBGPU_REASON,
    })
  })
})
