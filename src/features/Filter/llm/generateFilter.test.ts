// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logApi } from '@/debug'
import type { LLMChatRequest } from '@/features/LLMQuery/api/chatgpt'
import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import { FilterPredicate, MatchType } from '@/models/FilterModel/FilterTree'
import type { Network } from '@/models/NetworkModel/Network'
import type { Table } from '@/models/TableModel/Table'

import {
  clearResponseFormatFallbacks,
  describeError,
  generateFilter,
  GenerateFilterInput,
  isResponseFormatRejection,
  MAX_REPAIRS,
  NOT_CONFIGURED_MESSAGE,
  REQUEST_TIMEOUT_MS,
} from './generateFilter'

const NETWORK: Network = {
  id: 'net',
  nodes: [{ id: 'a' }, { id: 'b' }],
  edges: [{ id: 'ab', s: 'a', t: 'b' }],
}

const NODE_TABLE: Table = {
  id: 'nodes',
  columns: [
    { name: 'name', type: 'string' },
    { name: 'score', type: 'double' },
  ],
  rows: new Map([
    ['a', { name: 'TP53', score: 0.9 }],
    ['b', { name: 'EGFR', score: 0.1 }],
  ]),
}

const EDGE_TABLE: Table = { id: 'edges', columns: [], rows: new Map() }

const SECRET = 'sk-test-secret-key-123'

const input = (
  overrides: Partial<GenerateFilterInput> = {},
): GenerateFilterInput => ({
  request: 'select nodes with a score above 0.5',
  network: NETWORK,
  nodeTable: NODE_TABLE,
  edgeTable: EDGE_TABLE,
  settings: {
    providerId: 'openai',
    baseUrl: '',
    model: 'gpt-6-luna',
    apiKey: SECRET,
  },
  ...overrides,
})

const answer = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    outcome: 'filter',
    mode: 'select',
    name: 'High scores',
    explanation: 'Nodes with a score of 0.5 or more.',
    reason: null,
    transformers: [
      {
        id: 'org.cytoscape.ColumnFilter',
        parameters: {
          columnName: 'score',
          type: 'nodes',
          predicate: 'BETWEEN',
          criterion: [0.5, 0.9],
          caseSensitive: false,
          anyMatch: true,
        },
      },
    ],
    ...overrides,
  })

const BAD_ANSWER = answer({
  transformers: [
    {
      id: 'org.cytoscape.ColumnFilter',
      parameters: {
        columnName: 'nope',
        type: 'nodes',
        predicate: 'IS',
        criterion: 'x',
        caseSensitive: false,
        anyMatch: true,
      },
    },
  ],
})

const formatRejection = (): Error =>
  Object.assign(
    new Error("400 Invalid parameter: 'response_format' of type 'json_schema'"),
    { status: 400 },
  )

describe('generateFilter', () => {
  beforeEach(() => {
    clearResponseFormatFallbacks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('returns the filter of a good answer', async () => {
    const complete = vi.fn(async () => answer())
    const result = await generateFilter(input(), complete)

    expect(result).toMatchObject({
      kind: 'filter',
      mode: 'select',
      displayMode: DisplayMode.SELECT,
      explanation: 'Nodes with a score of 0.5 or more.',
      filter: {
        name: 'High scores',
        root: {
          matchType: MatchType.ALL,
          children: [
            { columnName: 'score', predicate: FilterPredicate.BETWEEN },
          ],
        },
      },
    })
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('sends the settings, the messages and a strict JSON schema', async () => {
    const complete = vi.fn(async (_: LLMChatRequest) => answer())
    await generateFilter(input(), complete)

    const [request] = complete.mock.calls[0]
    expect(request).toMatchObject({
      providerId: 'openai',
      baseUrl: '',
      model: 'gpt-6-luna',
      apiKey: SECRET,
      responseFormat: {
        type: 'json_schema',
        json_schema: { name: 'filter_answer', strict: true },
      },
    })
    expect(request.signal).toBeInstanceOf(AbortSignal)
    expect(request.messages.map((m) => m.role)).toEqual([
      'system',
      'user',
      'user',
    ])
    expect(request.messages[1].content).toContain('"name":"score"')
    expect(request.messages[2].content).toBe(
      'Request:\nselect nodes with a score above 0.5',
    )
  })

  it.each([
    ['show', DisplayMode.SHOW_HIDE, FilterPredicate.BETWEEN],
    ['hide', DisplayMode.SHOW_HIDE, FilterPredicate.IS_NOT_BETWEEN],
  ])('makes a %s filter', async (mode, displayMode, predicate) => {
    const result = await generateFilter(
      input(),
      vi.fn(async () => answer({ mode })),
    )
    expect(result).toMatchObject({
      kind: 'filter',
      mode,
      displayMode,
      filter: { root: { children: [{ predicate }] } },
    })
  })

  it('passes on why a request cannot be expressed', async () => {
    const result = await generateFilter(
      input(),
      vi.fn(async () =>
        answer({
          outcome: 'unsupported',
          mode: null,
          reason: 'Filters cannot rank nodes.',
          transformers: null,
        }),
      ),
    )
    expect(result).toEqual({
      kind: 'unsupported',
      reason: 'Filters cannot rank nodes.',
    })
  })

  it('asks for a correction and takes the corrected answer', async () => {
    const complete = vi
      .fn<(request: LLMChatRequest) => Promise<string>>()
      .mockResolvedValueOnce(BAD_ANSWER)
      .mockResolvedValueOnce(answer())

    const result = await generateFilter(input(), complete)

    expect(result.kind).toBe('filter')
    expect(complete).toHaveBeenCalledTimes(2)
    const repair = complete.mock.calls[1][0].messages
    expect(repair.map((m) => m.role)).toEqual([
      'system',
      'user',
      'user',
      'assistant',
      'user',
    ])
    expect(repair[3].content).toBe(BAD_ANSWER)
    expect(repair[4].content).toContain(
      'Node table does not have column "nope"',
    )
  })

  it(`gives up after ${MAX_REPAIRS} corrections`, async () => {
    const complete = vi.fn(async () => BAD_ANSWER)
    const result = await generateFilter(input(), complete)

    expect(complete).toHaveBeenCalledTimes(MAX_REPAIRS + 1)
    expect(result).toEqual({
      kind: 'failed',
      reason:
        'The condition on node column "nope": Node table does not have column "nope".',
    })
  })

  describe('response format', () => {
    it('falls back to JSON mode, then to text, and remembers it', async () => {
      const complete = vi
        .fn<(request: LLMChatRequest) => Promise<string>>()
        .mockRejectedValueOnce(formatRejection())
        .mockRejectedValueOnce(formatRejection())
        .mockResolvedValue(answer())

      expect((await generateFilter(input(), complete)).kind).toBe('filter')
      expect(
        complete.mock.calls.map(([r]) => r.responseFormat?.type ?? 'text'),
      ).toEqual(['json_schema', 'json_object', 'text'])

      // The same endpoint and model start where they ended
      await generateFilter(input(), complete)
      expect(complete.mock.calls[3][0].responseFormat).toBeUndefined()

      // Another model starts again with the schema
      await generateFilter(
        input({ settings: { ...input().settings, model: 'gpt-6.1-sol' } }),
        complete,
      )
      expect(complete.mock.calls[4][0].responseFormat?.type).toBe('json_schema')
    })

    it('does not fall back on other errors', async () => {
      const complete = vi.fn(async () => {
        throw Object.assign(new Error('400 context_length_exceeded'), {
          status: 400,
        })
      })
      const result = await generateFilter(input(), complete)
      expect(complete).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        kind: 'failed',
        reason: '400 context_length_exceeded',
      })
    })
  })

  describe('refuses to start', () => {
    it('without an LLM', async () => {
      const complete = vi.fn(async () => answer())
      const result = await generateFilter(
        input({ settings: { ...input().settings, apiKey: '  ' } }),
        complete,
      )
      expect(result).toEqual({ kind: 'failed', reason: NOT_CONFIGURED_MESSAGE })
      expect(complete).not.toHaveBeenCalled()
    })

    it('without a description', async () => {
      const complete = vi.fn(async () => answer())
      const result = await generateFilter(input({ request: '  ' }), complete)
      expect(result).toEqual({
        kind: 'failed',
        reason: 'Describe the filter first.',
      })
      expect(complete).not.toHaveBeenCalled()
    })
  })

  describe('cancelling', () => {
    it('before the request', async () => {
      const controller = new AbortController()
      controller.abort()
      const complete = vi.fn(async () => answer())
      expect(
        await generateFilter(input({ signal: controller.signal }), complete),
      ).toEqual({ kind: 'cancelled' })
      expect(complete).not.toHaveBeenCalled()
    })

    it('during the request aborts it', async () => {
      const controller = new AbortController()
      const complete = vi.fn(
        (request: LLMChatRequest) =>
          new Promise<string>((_, reject) => {
            request.signal?.addEventListener('abort', () =>
              reject(new Error('Request was aborted.')),
            )
            controller.abort()
          }),
      )
      expect(
        await generateFilter(input({ signal: controller.signal }), complete),
      ).toEqual({ kind: 'cancelled' })
    })

    it('ignores an answer that arrives after the abort', async () => {
      const controller = new AbortController()
      const complete = vi.fn(async () => {
        controller.abort()
        return answer()
      })
      expect(
        await generateFilter(input({ signal: controller.signal }), complete),
      ).toEqual({ kind: 'cancelled' })
    })
  })

  it(`stops a request after ${REQUEST_TIMEOUT_MS / 1000} seconds`, async () => {
    vi.useFakeTimers()
    const complete = vi.fn(
      (request: LLMChatRequest) =>
        new Promise<string>((_, reject) => {
          request.signal?.addEventListener('abort', () =>
            reject(new Error('Request was aborted.')),
          )
        }),
    )
    const pending = generateFilter(input(), complete)
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    expect(await pending).toEqual({
      kind: 'failed',
      reason: `The LLM did not answer within ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
    })
  })

  it('never shows or logs the API key', async () => {
    const logged: unknown[] = []
    vi.spyOn(logApi, 'error').mockImplementation((...args) => {
      logged.push(...args)
    })
    vi.spyOn(logApi, 'info').mockImplementation((...args) => {
      logged.push(...args)
    })
    const complete = vi.fn(async () => {
      throw Object.assign(
        new Error(`401 Incorrect API key provided: ${SECRET}.`),
        { status: 401 },
      )
    })
    const result = await generateFilter(input(), complete)
    expect(result).toEqual({
      kind: 'failed',
      reason: '401 Incorrect API key provided: ….',
    })
    expect(JSON.stringify(logged)).not.toContain(SECRET)
    expect(JSON.stringify(logged)).not.toContain('score above')
  })
})

describe('isResponseFormatRejection', () => {
  it('recognizes a 400 that names the response format', () => {
    expect(isResponseFormatRejection(formatRejection())).toBe(true)
    expect(
      isResponseFormatRejection(
        Object.assign(new Error('400 json_object is not supported'), {
          status: 400,
        }),
      ),
    ).toBe(true)
  })

  it.each([
    [
      'another status',
      Object.assign(new Error('response_format'), { status: 500 }),
    ],
    ['another 400', Object.assign(new Error('bad model'), { status: 400 })],
    ['no error', { status: 400, message: 'response_format' }],
    ['nothing', undefined],
  ])('ignores %s', (_, error) => {
    expect(isResponseFormatRejection(error)).toBe(false)
  })
})

describe('describeError', () => {
  it('masks keys and keeps one short line', () => {
    expect(describeError(new Error(`bad key ${SECRET}`), SECRET)).toBe(
      'bad key …',
    )
    expect(describeError(new Error('Key sk-abc***xyz rejected'), '')).toBe(
      'Key sk-… rejected',
    )
    expect(describeError(new Error('first\nsecond'), '')).toBe('first')
    expect(describeError('x'.repeat(500), '')).toHaveLength(200)
  })
})
