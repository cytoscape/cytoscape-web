import { currentDbScope, DbScope } from '../../../data/db/dbScope'
import { logStore } from '../../../debug'
import {
  endpointOrigin,
  getApiKeyError,
  LLMApiKeys,
} from '../model/LLMProvider'
import { LLM_API_KEYS_SESSION_KEY } from './storageKeys'

/**
 * The LLM API keys, kept in sessionStorage (#849).
 *
 * sessionStorage is the whole point: a key survives a reload, and is gone
 * when the tab closes. Keys never go to IndexedDB or localStorage, which keep
 * them in plaintext on disk with no expiry, readable by every script that
 * ever runs in this origin. sessionStorage does not protect a key from a
 * script running in this tab; nothing in a page that calls the provider
 * directly can.
 *
 * Two things follow from the choice and are accepted: "Duplicate tab" copies
 * sessionStorage, so the copy has the keys too, and a browser that restores
 * the session after a restart may restore them.
 *
 * Nothing here logs a stored value or an exception that could quote one.
 */

// Longer than any origin a browser will accept in a URL field
const MAX_ORIGIN_LENGTH = 2048

/**
 * The keys of this tab, with the endpoint the custom key was entered for.
 * A custom key is only ever sent to that origin (see the store), so the
 * origin is stored beside the key rather than worked out again later from
 * options another tab may have changed.
 */
export interface LLMSessionKeys extends LLMApiKeys {
  // '' when there is no custom key, or it was entered with no endpoint set
  readonly customKeyOrigin: string
}

const NO_KEYS: LLMSessionKeys = {
  openAiKey: '',
  customKey: '',
  customKeyOrigin: '',
}

const asKey = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }
  // The same limit the dialog and the store apply (getApiKeyError), so this
  // only ever drops a stored value that did not come from them.
  const key = value.trim()
  return getApiKeyError(key) === undefined ? key : ''
}

/**
 * A stored origin is used only if it is exactly an http(s) origin. Anything
 * else (a URL with a path, free text) reads as "no origin", which no endpoint
 * matches, so the key beside it is bound to nothing.
 */
const asOrigin = (value: unknown): string =>
  typeof value === 'string' &&
  value.length <= MAX_ORIGIN_LENGTH &&
  value !== '' &&
  endpointOrigin(value) === value
    ? value
    : ''

/** The keys typed earlier in this tab, or empty strings. */
export const loadLLMSessionKeys = (): LLMSessionKeys => {
  let raw: string | null
  try {
    raw = window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY)
  } catch {
    // sessionStorage can be unavailable (privacy mode, sandboxed iframe).
    logStore.warn('[llmKeySession] sessionStorage is not readable')
    return { ...NO_KEYS }
  }
  if (raw === null || raw === '') {
    return { ...NO_KEYS }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // The error is deliberately not logged: a JSON syntax error quotes the
    // text it failed on, which here is the stored keys.
    logStore.warn('[llmKeySession] Ignoring stored keys that are not JSON')
    return { ...NO_KEYS }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...NO_KEYS }
  }

  // Read the known fields and build a fresh object; the stored one is never
  // spread or returned.
  const stored = parsed as Record<string, unknown>
  return {
    openAiKey: asKey(stored.openAiKey),
    customKey: asKey(stored.customKey),
    customKeyOrigin: asOrigin(stored.customKeyOrigin),
  }
}

/** Remember the keys for this tab. With no key left, the item is removed. */
export const saveLLMSessionKeys = (keys: LLMSessionKeys): void => {
  const openAiKey = asKey(keys.openAiKey)
  const customKey = asKey(keys.customKey)
  const customKeyOrigin = customKey === '' ? '' : asOrigin(keys.customKeyOrigin)
  try {
    if (openAiKey === '' && customKey === '') {
      window.sessionStorage.removeItem(LLM_API_KEYS_SESSION_KEY)
      return
    }
    window.sessionStorage.setItem(
      LLM_API_KEYS_SESSION_KEY,
      JSON.stringify({ openAiKey, customKey, customKeyOrigin }),
    )
  } catch {
    // Logged, because a silent failure means the key quietly stops surviving
    // a reload. The error is left out: it must never carry a key.
    logStore.warn('[llmKeySession] Could not save the API keys for this tab')
  }
}

/** Forget every key stored for this tab. */
export const clearLLMSessionKeys = (): void => {
  saveLLMSessionKeys(NO_KEYS)
}

/**
 * Remove the keys from a manual tab. Call it when the manual starts.
 *
 * Help > User Manual opens the manual with `window.open` and an opener (the
 * manual's "Go to Cytoscape Web" needs it), and a tab opened that way starts
 * with a COPY of the opener's sessionStorage, the keys included. The manual
 * never sends a query and has no Forget key button, so the copy is exposure
 * with no use. Worse, "Go to Cytoscape Web" can load the editor in that tab,
 * where the copy would bring back a key the user had since forgotten in the
 * editor tab.
 *
 * It follows that opening the manual in the editor's own tab (by typing its
 * address) also forgets the key there.
 */
export const discardLLMSessionKeysInManualTab = (
  scope: DbScope = currentDbScope(),
): void => {
  if (scope === 'manual') {
    clearLLMSessionKeys()
  }
}
