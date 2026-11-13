import { z } from 'zod'

import {
  putProfileSetting,
  readProfileSetting,
} from '../../../data/db/profileDb'
import { logStore } from '../../../debug'
import { LLMModel, MAX_MODEL_NAME_LENGTH, models } from '../model/LLMModel'
import {
  getEndpointError,
  LLMProviderId,
  MAX_ENDPOINT_URL_LENGTH,
  providers,
} from '../model/LLMProvider'
import { LLM_QUERY_OPTIONS_SETTING } from './storageKeys'

export { LLM_QUERY_OPTIONS_SETTING }

/**
 * The LLM Query options that are remembered in this browser (#849): provider,
 * endpoint and model, in the profile database so no workspace reset removes
 * them. The API keys are not options and are never written here (see
 * llmKeySession.ts).
 */
export interface LLMQueryOptions {
  readonly provider: LLMProviderId
  // '' means the OpenAI default
  readonly baseUrl: string
  readonly model: LLMModel
}

const PROVIDER_IDS = providers.map((p) => p.id) as [
  LLMProviderId,
  ...LLMProviderId[],
]

/**
 * The stored row. Unknown fields are dropped by `z.object`, and the result is
 * a new object built from these three fields only, so nothing else a row
 * carries (an `apiKey`, a `__proto__`) reaches the store.
 */
const storedOptionsSchema = z.object({
  provider: z.enum(PROVIDER_IDS),
  baseUrl: z
    .string()
    .trim()
    .max(MAX_ENDPOINT_URL_LENGTH)
    // Same rule the dialog applies: empty, or an http(s) URL. Checked without
    // a key; whether a key may travel to this endpoint is decided again when
    // a request is built (api/chatgpt.ts).
    .refine((url) => getEndpointError(url, '') === undefined),
  // Absent means "the default model": see toStoredOptions.
  model: z.string().trim().min(1).max(MAX_MODEL_NAME_LENGTH).optional(),
})

type StoredLLMQueryOptions = z.infer<typeof storedOptionsSchema>

/**
 * Narrow a stored row to usable options, or undefined when it is not one.
 *
 * A stored row is untrusted: the user can edit it in DevTools, and it
 * outlives the build that wrote it.
 */
export const parseLLMQueryOptions = (
  raw: unknown,
): LLMQueryOptions | undefined => {
  const result = storedOptionsSchema.safeParse(raw)
  if (!result.success) {
    return undefined
  }
  const { provider, baseUrl, model } = result.data

  if (provider === 'openai') {
    // The OpenAI key is sent to whatever endpoint is stored beside provider
    // `openai`, so that endpoint is always the OpenAI default. The dialog
    // already guarantees it; a stored row must not be able to undo it.
    return { provider, baseUrl: '', model: model ?? models[0] }
  }
  if (model === undefined) {
    // Only OpenAI has a default model to fall back on.
    return undefined
  }
  return { provider, baseUrl, model }
}

/**
 * The default OpenAI model is stored as "no model", so that a user who never
 * picked one follows the default when it changes instead of staying pinned
 * to a model that may since have been retired.
 */
const toStoredOptions = (options: LLMQueryOptions): StoredLLMQueryOptions => {
  const provider = options.provider
  const baseUrl = provider === 'openai' ? '' : options.baseUrl.trim()
  const model = options.model.trim()
  return provider === 'openai' && model === models[0]
    ? { provider, baseUrl }
    : { provider, baseUrl, model }
}

/**
 * The remembered options, or undefined when there are none to use. Rejects
 * when the database cannot be read: options that may exist are not the same
 * as no options, and the store must not forget a key because of a failed read.
 */
export const loadLLMQueryOptions = async (): Promise<
  LLMQueryOptions | undefined
> => {
  const raw = await readProfileSetting(LLM_QUERY_OPTIONS_SETTING)
  if (raw === undefined) {
    return undefined
  }
  const options = parseLLMQueryOptions(raw)
  if (options === undefined) {
    logStore.warn(
      '[llmOptionsPersistence] Ignoring stored LLM Query options that are ' +
        'not valid; using the defaults',
    )
  }
  return options
}

/**
 * Remember the options in this browser. Rejects when the write fails, and
 * when the options are not ones the reader would accept: a row that cannot be
 * read back is worse than no row, because the next reload would put the
 * defaults in its place. The dialog applies the same limits before Confirm,
 * so this only stops other callers; the row already saved is left as it is.
 */
export const saveLLMQueryOptions = async (
  options: LLMQueryOptions,
): Promise<void> => {
  const row = storedOptionsSchema.safeParse(toStoredOptions(options))
  if (!row.success) {
    throw new Error('LLM Query options are not valid and were not saved')
  }
  await putProfileSetting(LLM_QUERY_OPTIONS_SETTING, row.data)
}
