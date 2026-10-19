import type { AppConfig, ModelRecord } from '@mlc-ai/web-llm'

import { LLMModel } from './LLMModel'

/**
 * A model the in-browser WebLLM provider can run. WebLLM only runs models
 * compiled for it, so this is a fixed list, not a free-text name.
 */
export interface WebLLMModelOption {
  // WebLLM model_id; this is what the store keeps as the LLM model
  readonly id: LLMModel
  readonly label: string
  // Weights fetched on first load, then cached by the browser
  readonly downloadMB: number
  readonly vramMB: number
  readonly requiresShaderF16: boolean
  readonly record: ModelRecord
}

/** Progress of the in-browser model load, shown by the run buttons and panel. */
export type WebLLMStatus =
  | { readonly state: 'idle' }
  | {
      readonly state: 'loading'
      readonly modelId: LLMModel
      // 0..1, as WebLLM reports it
      readonly progress: number
      readonly text: string
    }
  | { readonly state: 'ready'; readonly modelId: LLMModel }
  | {
      readonly state: 'error'
      readonly modelId: LLMModel
      readonly message: string
    }

// Every artifact is pinned rather than read from a moving branch: the weights
// to a Hugging Face commit, and the compiled WebGPU library to a commit of
// mlc-ai/binary-mlc-llm-libs. The library is code the browser executes, so it
// and the files that steer it (chat config, tokenizer) also carry SRI hashes
// that WebLLM checks before use. Weight shards are data and are not hashed.
// To update: bump the commits, then recompute every hash (see the feature docs).
const MODEL_LIB_URL_PREFIX =
  'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/00fe7a40e57e5e8eb9fef87526a4bf28ad5846c0/web-llm-models/v0_2_86/base/'

// The prebuilt libraries are compiled for this context window; a larger one
// costs GPU memory for the KV cache.
const CONTEXT_WINDOW_SIZE = 4096

interface PinnedModel {
  readonly id: string
  readonly label: string
  readonly revision: string
  readonly modelLib: string
  readonly downloadMB: number
  readonly vramMB: number
  readonly lowResource: boolean
  readonly configSri: string
  readonly tokenizerSri: string
  readonly modelLibSri: string
}

const toOption = (m: PinnedModel): WebLLMModelOption => {
  const requiresShaderF16 = m.id.includes('q4f16')
  return {
    id: m.id,
    label: m.label,
    downloadMB: m.downloadMB,
    vramMB: m.vramMB,
    requiresShaderF16,
    record: {
      model: `https://huggingface.co/mlc-ai/${m.id}/resolve/${m.revision}/`,
      model_id: m.id,
      model_lib: MODEL_LIB_URL_PREFIX + m.modelLib,
      vram_required_MB: m.vramMB,
      low_resource_required: m.lowResource,
      // WebLLM's prebuilt records omit this, so a GPU without f16 shaders
      // would only fail after the download; declaring it fails fast instead.
      ...(requiresShaderF16 ? { required_features: ['shader-f16'] } : {}),
      overrides: { context_window_size: CONTEXT_WINDOW_SIZE },
      integrity: {
        config: m.configSri,
        model_lib: m.modelLibSri,
        tokenizer: { 'tokenizer.json': m.tokenizerSri },
        onFailure: 'error',
      },
    },
  }
}

const QWEN_TOKENIZER_SRI =
  'sha384-l5K5CpBtbywB5lTHysuesWqCadOP0PqIM5CaLYNPn2xpBA30Q5pAgRo4L1K2EjDM'
const LLAMA_TOKENIZER_SRI =
  'sha384-sxzCFhkPOhbSR/sAOzWzL3771LPW0nWbKJM29ceyLk4XhoD9ThF5KzdsD0E+eN5N'

// Each family is listed once per shader precision; a GPU with shader-f16 is
// offered the f16 builds (less GPU memory), any other GPU the f32 builds.
// Within a precision, the first entry is the default.
export const webLLMModels: readonly WebLLMModelOption[] = [
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 3B Instruct',
    revision: '7690aaaa46df36b1be0fe93b9c9abac0497eff6c',
    modelLib: 'Qwen2.5-3B-Instruct-q4f16_1_cs1k-webgpu.wasm',
    downloadMB: 1736,
    vramMB: 2505,
    lowResource: true,
    configSri:
      'sha384-I4+GSG1j5gwJBwOrkgGafimu+DA22OUWTLcCEg6Yx35ofY27su4rkYpUgl/tR0It',
    tokenizerSri: QWEN_TOKENIZER_SRI,
    modelLibSri:
      'sha384-12wpVtQcPRCIzU3ImQG1dpl8ZiO0oJbUXYrDzLU5BBJhiTDzDY+8D5sk4l9WJySE',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B Instruct',
    revision: '1e80abf71e3d17cd564e2d2b63caa15cb226018e',
    modelLib: 'Llama-3.2-3B-Instruct-q4f16_1_cs1k-webgpu.wasm',
    downloadMB: 1807,
    vramMB: 2264,
    lowResource: true,
    configSri:
      'sha384-oarQXf8AFQVvh+gdWgUZn9P+LLdBvtquL1YKQkvwUmIaSuJOZcFmKJXTTbT/8rlE',
    tokenizerSri: LLAMA_TOKENIZER_SRI,
    modelLibSri:
      'sha384-HMrV4YIJnTfS4Sb0/ff4H2Vy/Bzu4JOntnydb/3LX9RP3laiA5wfzFPlMSNHutlp',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi-3.5 mini Instruct',
    revision: '206a7da25b5efbef7b50502993367fcb05183a1d',
    modelLib: 'Phi-3.5-mini-instruct-q4f16_1_cs1k-webgpu.wasm',
    downloadMB: 2150,
    vramMB: 3672,
    lowResource: false,
    configSri:
      'sha384-j6oX/TPaOnMh9c3OS3nTLT3GKA1vmwpkNfAZ5ObGsk0UUFP1uJenp8JNS1KTkXXH',
    tokenizerSri:
      'sha384-hhtbJ+Pgk1UlatyjT98md+A9DVLkQ+UaMI6P9YcrXbmXj6y9q4D19oF+l/vZry0k',
    modelLibSri:
      'sha384-M6YMwHz9wA48+2Qo5lCi35ITQhIsro2LE7tB6x6UmmA2hkaoUTssXEpT/MczFIm2',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 1.5B Instruct',
    revision: '9bd564b064631febf14deadcac492efb761d60c3',
    modelLib: 'Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm',
    downloadMB: 869,
    vramMB: 1630,
    lowResource: true,
    configSri:
      'sha384-edTpAfxnd5O5jvlUbExraVs/Bmqwpni3s8wpFZMcNPSG+5O9sr1ltJJG9zQaM/Vb',
    tokenizerSri: QWEN_TOKENIZER_SRI,
    modelLibSri:
      'sha384-fulpsruohkPyMTwf0apV5cWRZWzfOsLlBQjxRbwiNdFg7CZD+iBrRJ5+IL9MenBN',
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 3B Instruct',
    revision: 'dfa91e859b714acfa489a1464297080656c3460d',
    modelLib: 'Qwen2.5-3B-Instruct-q4f32_1_cs1k-webgpu.wasm',
    downloadMB: 1736,
    vramMB: 2894,
    lowResource: true,
    configSri:
      'sha384-JBmhOJFe6jtVZYCxGW9kLxcLxwtRCGvz4i/OuqaOTM5Vo0YKL6yohSYKMzB1ai21',
    tokenizerSri: QWEN_TOKENIZER_SRI,
    modelLibSri:
      'sha384-hA7d3ssBRWox9sU474Wc4y3VwekkymQ/Ctwh9ktZiA+5620RaxTY9v1UIbh8fOmV',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    label: 'Llama 3.2 3B Instruct',
    revision: '6083cfdaaf08d2dd4872d7f5b87fb0242aa7d75c',
    modelLib: 'Llama-3.2-3B-Instruct-q4f32_1_cs1k-webgpu.wasm',
    downloadMB: 1807,
    vramMB: 2952,
    lowResource: true,
    configSri:
      'sha384-nD3fJjUTFmDWFlf64QmB4Jg0fVGtRQRtQlfDpuyEcPcpGbXXHxutXresRf3PPqpP',
    tokenizerSri: LLAMA_TOKENIZER_SRI,
    modelLibSri:
      'sha384-0bNqFrEiTrBEipP31aKN0e15yYDm9LLFezYfqQhxgD3nyL9w4YTQGDMWMMGMTPsT',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 1.5B Instruct',
    revision: 'a822ee410075710c9673005eafa017b90136b85d',
    modelLib: 'Qwen2-1.5B-Instruct-q4f32_1_cs1k-webgpu.wasm',
    downloadMB: 869,
    vramMB: 1889,
    lowResource: true,
    configSri:
      'sha384-s7l0iGYBJ5APr2LPnSwXd3hasAK5nEGN1sn/CuuY34cGyQ6tFkvGxzWmv1x4G3ay',
    tokenizerSri: QWEN_TOKENIZER_SRI,
    modelLibSri:
      'sha384-wL+eu+35hvKn1bLSSKiqib+bYqw4/GfY5Y/H7x9SrlkEGeo7AftcjcTKgvly3RuW',
  },
].map(toOption)

/** The models a GPU can run: f16 builds when it has shader-f16, else f32. */
export const getWebLLMModelOptions = (
  shaderF16: boolean,
): readonly WebLLMModelOption[] =>
  webLLMModels.filter((m) => m.requiresShaderF16 === shaderF16)

export const findWebLLMModel = (id: LLMModel): WebLLMModelOption | undefined =>
  webLLMModels.find((m) => m.id === id)

/** Only the curated models, so the engine can never be pointed elsewhere. */
export const webLLMAppConfig: AppConfig = {
  model_list: webLLMModels.map((m) => m.record),
  cacheBackend: 'cache',
}

export const formatModelSize = (megabytes: number): string =>
  megabytes >= 1000
    ? `${(megabytes / 1000).toFixed(1)} GB`
    : `${Math.round(megabytes)} MB`
