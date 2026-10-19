// @vitest-environment node
import { isValidSRI } from '@mlc-ai/web-llm'
import { describe, expect, it } from 'vitest'

import {
  findWebLLMModel,
  formatModelSize,
  getWebLLMModelOptions,
  webLLMAppConfig,
  webLLMModels,
} from './WebLLMModel'

const COMMIT = /^[0-9a-f]{40}$/

describe('WebLLM model catalog', () => {
  it('has unique model ids', () => {
    const ids = webLLMModels.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('pins every weight repository to a Hugging Face commit, never a branch', () => {
    for (const m of webLLMModels) {
      const match = m.record.model.match(
        /^https:\/\/huggingface\.co\/mlc-ai\/([^/]+)\/resolve\/([^/]+)\/$/,
      )
      expect(match, m.id).not.toBeNull()
      expect(match?.[1]).toBe(m.id)
      expect(match?.[2]).toMatch(COMMIT)
    }
  })

  it('pins every WebGPU library to a commit and checks its integrity', () => {
    for (const m of webLLMModels) {
      const url = new URL(m.record.model_lib)
      expect(url.protocol).toBe('https:')
      expect(url.hostname).toBe('raw.githubusercontent.com')
      const ref = url.pathname.split('/')[3]
      expect(ref, m.id).toMatch(COMMIT)
      expect(url.pathname.endsWith('-webgpu.wasm')).toBe(true)

      const integrity = m.record.integrity
      expect(integrity?.onFailure).toBe('error')
      expect(isValidSRI(integrity?.model_lib ?? '')).toBe(true)
      expect(isValidSRI(integrity?.config ?? '')).toBe(true)
      expect(isValidSRI(integrity?.tokenizer?.['tokenizer.json'] ?? '')).toBe(
        true,
      )
    }
  })

  it('declares shader-f16 on the f16 builds so an unsupported GPU fails before downloading', () => {
    for (const m of webLLMModels) {
      expect(m.requiresShaderF16).toBe(m.id.includes('q4f16'))
      expect(m.record.required_features ?? []).toEqual(
        m.requiresShaderF16 ? ['shader-f16'] : [],
      )
    }
  })

  it('offers f16 builds to GPUs with shader-f16 and f32 builds otherwise', () => {
    const f16 = getWebLLMModelOptions(true)
    const f32 = getWebLLMModelOptions(false)
    expect(f16.length).toBeGreaterThan(0)
    expect(f32.length).toBeGreaterThan(0)
    expect(f16.every((m) => m.requiresShaderF16)).toBe(true)
    expect(f32.every((m) => !m.requiresShaderF16)).toBe(true)
    // A 3B model is the default either way: the smaller ones answer poorly
    expect(f16[0].id).toBe('Qwen2.5-3B-Instruct-q4f16_1-MLC')
    expect(f32[0].id).toBe('Qwen2.5-3B-Instruct-q4f32_1-MLC')
  })

  it('limits the engine to the curated models', () => {
    expect(webLLMAppConfig.model_list.map((r) => r.model_id)).toEqual(
      webLLMModels.map((m) => m.id),
    )
    expect(webLLMAppConfig.cacheBackend).toBe('cache')
  })

  it('finds curated models by id and nothing else', () => {
    expect(findWebLLMModel('Llama-3.2-3B-Instruct-q4f16_1-MLC')?.label).toBe(
      'Llama 3.2 3B Instruct',
    )
    expect(findWebLLMModel('gpt-6-luna')).toBeUndefined()
    expect(findWebLLMModel('')).toBeUndefined()
  })

  it('formats sizes in MB below a gigabyte and GB above', () => {
    expect(formatModelSize(869)).toBe('869 MB')
    expect(formatModelSize(1736)).toBe('1.7 GB')
    expect(formatModelSize(1000)).toBe('1.0 GB')
  })
})
