import { logApi } from '../../../debug'

export type WebGPUSupport =
  | {
      readonly supported: true
      // Whether the f16 model builds can run (they need less GPU memory)
      readonly shaderF16: boolean
      readonly adapterName: string
    }
  | { readonly supported: false; readonly reason: string }

// Only the part of the WebGPU API the check uses, so it neither depends on the
// DOM lib's WebGPU typings nor needs a GPU in tests.
interface GPUAdapterLike {
  readonly features: { has: (feature: string) => boolean }
  readonly info?: { readonly vendor?: string; readonly description?: string }
}
interface GPULike {
  requestAdapter: (options?: {
    powerPreference?: 'low-power' | 'high-performance'
  }) => Promise<GPUAdapterLike | null>
}
export interface WebGPUEnvironment {
  readonly isSecureContext: boolean
  readonly gpu?: GPULike
}

export const NO_WEBGPU_REASON =
  'This browser does not support WebGPU, which the in-browser models need. Use a recent desktop version of Chrome, Edge or Safari, or choose another provider.'
export const INSECURE_CONTEXT_REASON =
  'WebGPU is only available on pages served over HTTPS (or from localhost).'
export const NO_ADAPTER_REASON =
  'This browser supports WebGPU, but found no usable GPU. The GPU may be unsupported, or WebGPU may be turned off in the browser settings.'

/**
 * Whether this browser, OS and GPU can run WebLLM. `navigator.gpu` existing
 * is not enough: on blocklisted GPUs and some Linux setups the API is there
 * but no adapter is returned.
 */
export const detectWebGPUSupport = async (
  env: WebGPUEnvironment,
): Promise<WebGPUSupport> => {
  if (!env.isSecureContext) {
    return { supported: false, reason: INSECURE_CONTEXT_REASON }
  }
  if (env.gpu === undefined) {
    return { supported: false, reason: NO_WEBGPU_REASON }
  }
  try {
    const adapter = await env.gpu.requestAdapter({
      powerPreference: 'high-performance',
    })
    if (adapter === null) {
      return { supported: false, reason: NO_ADAPTER_REASON }
    }
    const info = adapter.info
    return {
      supported: true,
      shaderF16: adapter.features.has('shader-f16'),
      adapterName: info?.description || info?.vendor || 'WebGPU',
    }
  } catch (e) {
    logApi.warn(`[${detectWebGPUSupport.name}]: requestAdapter failed`, e)
    return { supported: false, reason: NO_ADAPTER_REASON }
  }
}

let cachedSupport: Promise<WebGPUSupport> | undefined

/** The check for this browser, run once per session. */
export const getWebGPUSupport = (): Promise<WebGPUSupport> => {
  cachedSupport ??= detectWebGPUSupport({
    isSecureContext: globalThis.isSecureContext === true,
    gpu: (globalThis.navigator as { gpu?: GPULike } | undefined)?.gpu,
  })
  return cachedSupport
}

/** For tests: forget the cached check. */
export const resetWebGPUSupportCache = (): void => {
  cachedSupport = undefined
}
