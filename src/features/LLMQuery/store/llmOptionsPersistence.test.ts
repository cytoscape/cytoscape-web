// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  deleteProfileDb,
  getProfileSetting,
  putProfileSetting,
} from '../../../data/db/profileDb'
import { logStore } from '../../../debug'
import { MAX_MODEL_NAME_LENGTH, models } from '../model/LLMModel'
import {
  MAX_ENDPOINT_URL_LENGTH,
  OLLAMA_DEFAULT_BASE_URL,
} from '../model/LLMProvider'
import {
  LLM_QUERY_OPTIONS_SETTING,
  loadLLMQueryOptions,
  parseLLMQueryOptions,
  saveLLMQueryOptions,
} from './llmOptionsPersistence'

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteProfileDb()
})

describe('parseLLMQueryOptions', () => {
  it('accepts a well-formed row', () => {
    expect(
      parseLLMQueryOptions({
        provider: 'ollama',
        baseUrl: OLLAMA_DEFAULT_BASE_URL,
        model: 'llama3.1',
      }),
    ).toEqual({
      provider: 'ollama',
      baseUrl: OLLAMA_DEFAULT_BASE_URL,
      model: 'llama3.1',
    })
  })

  it('fills in the default model when OpenAI has none stored', () => {
    expect(parseLLMQueryOptions({ provider: 'openai', baseUrl: '' })).toEqual({
      provider: 'openai',
      baseUrl: '',
      model: models[0],
    })
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'openai'],
    ['a number', 42],
    ['an array', ['openai', '', 'gpt-5']],
    ['an empty object', {}],
  ])('rejects %s', (_label, raw) => {
    expect(parseLLMQueryOptions(raw)).toBeUndefined()
  })

  it.each([
    ['an unknown provider', { provider: 'evil', baseUrl: '', model: 'm' }],
    ['a provider of the wrong type', { provider: 1, baseUrl: '', model: 'm' }],
    [
      'an inherited property name as provider',
      { provider: 'constructor', baseUrl: '', model: 'm' },
    ],
    [
      'a javascript: endpoint',
      { provider: 'custom', baseUrl: 'javascript:alert(1)', model: 'm' },
    ],
    [
      'a file: endpoint',
      { provider: 'custom', baseUrl: 'file:///etc/passwd', model: 'm' },
    ],
    [
      'an endpoint that is not a URL',
      { provider: 'custom', baseUrl: 'not a url', model: 'm' },
    ],
    [
      'an endpoint of the wrong type',
      { provider: 'custom', baseUrl: { href: 'https://h/v1' }, model: 'm' },
    ],
    [
      'an over-long endpoint',
      {
        provider: 'custom',
        baseUrl: `https://h/${'a'.repeat(2048)}`,
        model: 'm',
      },
    ],
    [
      'an over-long model name',
      { provider: 'custom', baseUrl: 'https://h/v1', model: 'm'.repeat(201) },
    ],
    [
      'a blank model name',
      { provider: 'custom', baseUrl: 'https://h/v1', model: '   ' },
    ],
    [
      'a model of the wrong type',
      { provider: 'custom', baseUrl: 'https://h/v1', model: ['gpt-5'] },
    ],
    [
      'a non-OpenAI provider with no model',
      { provider: 'ollama', baseUrl: OLLAMA_DEFAULT_BASE_URL },
    ],
    [
      'an endpoint with a password in it',
      {
        provider: 'custom',
        baseUrl: 'https://user:secret@h/v1',
        model: 'gpt-5',
      },
    ],
  ])('rejects %s', (_label, raw) => {
    expect(parseLLMQueryOptions(raw)).toBeUndefined()
  })

  /**
   * Both query callers pass the stored base URL whatever the provider, and
   * the OpenAI key is the key sent for provider `openai`. A row pairing the
   * two would hand the OpenAI key to a host of the row author's choosing.
   */
  it('never pairs the OpenAI provider with another endpoint', () => {
    expect(
      parseLLMQueryOptions({
        provider: 'openai',
        baseUrl: 'https://evil.example/v1',
        model: 'gpt-5',
      }),
    ).toEqual({ provider: 'openai', baseUrl: '', model: 'gpt-5' })
  })

  it('ignores extra fields and cannot be used to pollute a prototype', () => {
    const raw: unknown = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},' +
        '"provider":"custom","baseUrl":"https://h/v1","model":"m","apiKey":"sk-x"}',
    )

    const parsed = parseLLMQueryOptions(raw)

    expect(parsed).toEqual({
      provider: 'custom',
      baseUrl: 'https://h/v1',
      model: 'm',
    })
    expect(Object.keys(parsed ?? {})).toEqual(['provider', 'baseUrl', 'model'])
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('saveLLMQueryOptions and loadLLMQueryOptions', () => {
  it('round-trips through the profile database', async () => {
    await saveLLMQueryOptions({
      provider: 'custom',
      baseUrl: 'https://llm.example.org/v1',
      model: 'my-model',
    })

    expect(await loadLLMQueryOptions()).toEqual({
      provider: 'custom',
      baseUrl: 'https://llm.example.org/v1',
      model: 'my-model',
    })
  })

  it('returns undefined when nothing was saved', async () => {
    expect(await loadLLMQueryOptions()).toBeUndefined()
  })

  it('stores exactly provider, endpoint and model', async () => {
    await saveLLMQueryOptions({
      provider: 'ollama',
      baseUrl: OLLAMA_DEFAULT_BASE_URL,
      model: 'llama3.1',
    })

    expect(await getProfileSetting(LLM_QUERY_OPTIONS_SETTING)).toEqual({
      provider: 'ollama',
      baseUrl: OLLAMA_DEFAULT_BASE_URL,
      model: 'llama3.1',
    })
  })

  /**
   * A user who never picked a model must follow the default when it changes
   * (the default has changed before: gpt-3.5-turbo was retired, #832).
   */
  it('does not pin the default OpenAI model', async () => {
    await saveLLMQueryOptions({
      provider: 'openai',
      baseUrl: '',
      model: models[0],
    })

    expect(await getProfileSetting(LLM_QUERY_OPTIONS_SETTING)).toEqual({
      provider: 'openai',
      baseUrl: '',
    })
    expect((await loadLLMQueryOptions())?.model).toBe(models[0])
  })

  it('keeps a model the user chose for OpenAI', async () => {
    await saveLLMQueryOptions({
      provider: 'openai',
      baseUrl: '',
      model: models[1],
    })

    expect((await loadLLMQueryOptions())?.model).toBe(models[1])
  })

  it('falls back to undefined, with a warning, on a row it cannot use', async () => {
    const warn = vi.spyOn(logStore, 'warn').mockImplementation(() => {})
    await putProfileSetting(LLM_QUERY_OPTIONS_SETTING, {
      provider: 'custom',
      baseUrl: 'javascript:alert(1)',
      model: 'm',
    })

    expect(await loadLLMQueryOptions()).toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })

  /**
   * Whatever is saved must be readable again. A row the reader rejects would
   * put the defaults back on the next reload, and with them forget the key of
   * the custom endpoint.
   */
  describe('limits', () => {
    const longestUrl = 'https://h/'.padEnd(MAX_ENDPOINT_URL_LENGTH, 'a')
    const longestModel = 'm'.repeat(MAX_MODEL_NAME_LENGTH)

    it('round-trips the longest endpoint and model it accepts', async () => {
      const options = {
        provider: 'custom',
        baseUrl: longestUrl,
        model: longestModel,
      } as const

      await saveLLMQueryOptions(options)

      expect(await loadLLMQueryOptions()).toEqual(options)
    })

    it.each([
      [
        'an over-long model',
        { baseUrl: longestUrl, model: `${longestModel}m` },
      ],
      ['an over-long endpoint', { baseUrl: `${longestUrl}a`, model: 'm' }],
      ['an endpoint that is not http(s)', { baseUrl: 'file:///x', model: 'm' }],
      ['a blank model', { baseUrl: longestUrl, model: '  ' }],
    ])(
      'refuses to save %s, and leaves the saved row alone',
      async (_l, bad) => {
        const saved = {
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        } as const
        await saveLLMQueryOptions(saved)

        await expect(
          saveLLMQueryOptions({ provider: 'custom', ...bad }),
        ).rejects.toThrow()

        expect(await loadLLMQueryOptions()).toEqual(saved)
      },
    )
  })
})
