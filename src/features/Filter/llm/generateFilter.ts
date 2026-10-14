import { logApi } from '@/debug'
import {
  LLMChatMessage,
  LLMChatRequest,
  LLMResponseFormat,
  requestChatCompletion,
} from '@/features/LLMQuery/api/chatgpt'
import {
  isLLMConfigured,
  LLMProviderId,
} from '@/features/LLMQuery/model/LLMProvider'
import type { DisplayMode } from '@/models/FilterModel/DisplayMode'
import type { NamedFilter } from '@/models/FilterModel/FilterTree'
import {
  FILTER_ANSWER_JSON_SCHEMA,
  GenerationMode,
  readFilterAnswer,
} from '@/models/FilterModel/impl/generation/filterAnswer'
import { buildFilterContext } from '@/models/FilterModel/impl/generation/filterContext'
import {
  buildFilterMessages,
  buildRepairMessages,
} from '@/models/FilterModel/impl/generation/filterPrompt'
import type { Network } from '@/models/NetworkModel/Network'
import type { Table } from '@/models/TableModel/Table'

/**
 * Building a FILTER tab filter from a description typed by the user, with
 * the LLM of the LLM Query Options dialog
 * (docs/specifications/LLM_FILTER_GENERATION_SPEC.md). No React and no
 * store: the caller passes the network and the settings, and adds the
 * filter.
 */

/** Corrections asked for after the first answer */
export const MAX_REPAIRS = 2

/** How long one request may take */
export const REQUEST_TIMEOUT_MS = 60_000

/** Shown when no LLM is set up */
export const NOT_CONFIGURED_MESSAGE =
  'Set up an LLM in Analysis › LLM Query Options.'

export interface LLMSettings {
  readonly providerId: LLMProviderId
  // '' means the OpenAI default
  readonly baseUrl: string
  readonly model: string
  // Already scoped to the provider (selectApiKey)
  readonly apiKey: string
}

export interface GenerateFilterInput {
  readonly request: string
  readonly network: Network
  readonly nodeTable: Table
  readonly edgeTable: Table
  readonly settings: LLMSettings
  readonly signal?: AbortSignal
}

export type GenerateFilterResult =
  | {
      readonly kind: 'filter'
      readonly filter: NamedFilter
      readonly mode: GenerationMode
      readonly displayMode: DisplayMode
      readonly explanation: string
    }
  | { readonly kind: 'unsupported'; readonly reason: string }
  | { readonly kind: 'failed'; readonly reason: string }
  | { readonly kind: 'cancelled' }

export type ChatCompletion = (request: LLMChatRequest) => Promise<string>

// ---------------------------------------------------------------------------
// Response format, with a fallback for endpoints that refuse it
// ---------------------------------------------------------------------------

const RESPONSE_FORMATS: readonly (LLMResponseFormat | undefined)[] = [
  {
    type: 'json_schema',
    json_schema: {
      name: 'filter_answer',
      strict: true,
      schema: FILTER_ANSWER_JSON_SCHEMA,
    },
  },
  { type: 'json_object' },
  // Plain text: the answer is still read as JSON
  undefined,
]

// The format each endpoint and model accepted, for the rest of the session
const acceptedFormat = new Map<string, number>()

const formatKey = (settings: LLMSettings): string =>
  `${settings.providerId}|${settings.baseUrl.trim()}|${settings.model}`

/** Forget which response formats endpoints accepted (tests) */
export const clearResponseFormatFallbacks = (): void => acceptedFormat.clear()

const statusOf = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'status' in error
    ? error.status
    : undefined

/**
 * Whether an endpoint refused the request because of its response format
 * (HTTP 400 naming it), so the request can be sent again without it
 */
export const isResponseFormatRejection = (error: unknown): boolean =>
  statusOf(error) === 400 &&
  error instanceof Error &&
  /response_format|json_schema|json_object/i.test(error.message)

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class TimeoutError extends Error {}

/**
 * An error message fit to show: API keys masked (an endpoint may echo part
 * of one back), cut to one short line
 */
export const describeError = (error: unknown, apiKey: string): string => {
  let message = error instanceof Error ? error.message : String(error)
  if (apiKey.trim() !== '') {
    message = message.split(apiKey.trim()).join('…')
  }
  message = message.replace(/sk-[\w*-]+/g, 'sk-…')
  const line = message.split('\n')[0].trim()
  return line.length > 200 ? `${line.slice(0, 199)}…` : line
}

/**
 * One request, aborted by the caller's signal or after REQUEST_TIMEOUT_MS
 */
const completeOnce = async (
  complete: ChatCompletion,
  input: GenerateFilterInput,
  messages: readonly LLMChatMessage[],
  responseFormat: LLMResponseFormat | undefined,
): Promise<string> => {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const onAbort = (): void => controller.abort()
  input.signal?.addEventListener('abort', onAbort)
  try {
    return await complete({
      ...input.settings,
      messages,
      ...(responseFormat === undefined ? {} : { responseFormat }),
      signal: controller.signal,
    })
  } catch (e) {
    throw timedOut ? new TimeoutError() : e
  } finally {
    clearTimeout(timer)
    input.signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * One request in the most structured format the endpoint accepts
 */
const completeWithFallback = async (
  complete: ChatCompletion,
  input: GenerateFilterInput,
  messages: readonly LLMChatMessage[],
): Promise<string> => {
  const key = formatKey(input.settings)
  for (
    let level = acceptedFormat.get(key) ?? 0;
    level < RESPONSE_FORMATS.length;
    level++
  ) {
    try {
      const answer = await completeOnce(
        complete,
        input,
        messages,
        RESPONSE_FORMATS[level],
      )
      acceptedFormat.set(key, level)
      return answer
    } catch (e) {
      if (level < RESPONSE_FORMATS.length - 1 && isResponseFormatRejection(e)) {
        logApi.warn(
          `[generateFilter]: The endpoint refused response format ${RESPONSE_FORMATS[level]?.type ?? 'text'}; trying the next one`,
        )
        continue
      }
      throw e
    }
  }
  // Unreachable: the last level has no format to refuse
  throw new Error('No response format was accepted')
}

/**
 * Ask the configured LLM for a filter matching `request` on the given
 * network, check the answer, and ask for corrections at most MAX_REPAIRS
 * times. Never throws.
 *
 * @param complete The chat completion call; the OpenAI-compatible client by
 *   default
 */
export const generateFilter = async (
  input: GenerateFilterInput,
  complete: ChatCompletion = requestChatCompletion,
): Promise<GenerateFilterResult> => {
  const { settings } = input
  if (
    !isLLMConfigured(settings.providerId, settings.apiKey, settings.baseUrl)
  ) {
    return { kind: 'failed', reason: NOT_CONFIGURED_MESSAGE }
  }
  if (input.request.trim() === '') {
    return { kind: 'failed', reason: 'Describe the filter first.' }
  }

  const context = buildFilterContext(
    input.network,
    input.nodeTable,
    input.edgeTable,
  )
  let messages: LLMChatMessage[] = buildFilterMessages(context, input.request)
  let lastProblem = ''
  // A function: TypeScript would keep the value narrowed across awaits
  const aborted = (): boolean => input.signal?.aborted === true

  try {
    for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
      if (aborted()) return { kind: 'cancelled' }
      // Sizes only: the messages hold the user's data
      logApi.info(
        `[generateFilter]: Request ${attempt + 1} to ${settings.model}: ${messages.length} messages, ${messages.reduce((sum, m) => sum + m.content.length, 0)} characters`,
      )
      const answer = await completeWithFallback(complete, input, messages)
      if (aborted()) return { kind: 'cancelled' }

      const result = readFilterAnswer(answer, input.nodeTable, input.edgeTable)
      switch (result.kind) {
        case 'filter':
          return {
            kind: 'filter',
            filter: result.filter,
            mode: result.mode,
            displayMode: result.displayMode,
            explanation: result.explanation,
          }
        case 'unsupported':
          return {
            kind: 'unsupported',
            reason:
              result.reason === ''
                ? 'The model gave no reason.'
                : result.reason,
          }
        case 'problems':
          logApi.warn(
            `[generateFilter]: Answer ${attempt + 1} has problems: ${result.problems.join(' | ')}`,
          )
          lastProblem = result.problems[0] ?? 'The answer could not be read.'
          messages = [
            ...messages,
            ...buildRepairMessages(answer, result.problems),
          ]
      }
    }
  } catch (e) {
    if (aborted()) return { kind: 'cancelled' }
    if (e instanceof TimeoutError) {
      logApi.warn('[generateFilter]: The LLM did not answer in time')
      return {
        kind: 'failed',
        reason: `The LLM did not answer within ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
      }
    }
    const reason = describeError(e, settings.apiKey)
    logApi.error(`[generateFilter]: Request failed: ${reason}`)
    return { kind: 'failed', reason }
  }

  return { kind: 'failed', reason: lastProblem }
}
