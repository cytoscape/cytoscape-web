/**
 * Browser-storage names the LLM Query feature owns.
 *
 * A leaf module with no imports, so a Playwright spec can import it in Node.
 * These values are a storage contract: renaming one orphans what a browser
 * already holds under the old name.
 */

/** sessionStorage: the API keys typed in this tab (see llmKeySession.ts). */
export const LLM_API_KEYS_SESSION_KEY = 'cyweb.llm.apiKeys'

/** `settings` row in the profile database (see llmOptionsPersistence.ts). */
export const LLM_QUERY_OPTIONS_SETTING = 'llmQueryOptions'
