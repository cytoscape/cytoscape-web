# LLMQuery Feature

## Overview

The LLMQuery feature integrates Large Language Model (LLM) capabilities to analyze gene sets from hierarchical networks. It allows users to query LLMs (OpenAI's GPT models, a local Ollama server, or any OpenAI-compatible endpoint) with gene symbols extracted from selected subsystem nodes in HCX (Hierarchical Cell eXchange) networks. The feature provides a menu item to run queries and a result panel to display and regenerate responses.

## Architecture

The LLMQuery feature consists of:

- **Menu Items**: Entry points for running queries and configuring options
- **Result Panel**: Displays query results and allows regeneration
- **API Layer**: Handles communication with an OpenAI-compatible chat completions API
- **Store**: Manages LLM query state (provider, endpoint, API key, model, template, results)
- **Persistence**: Provider, endpoint and model in the profile database; API keys in sessionStorage

## Component Structure

### Menu Components

- **RunLLMQueryMenuItem.tsx**: Menu item that triggers LLM queries
  - Extracts gene symbols from selected subsystem nodes
  - Validates HCX network requirements
  - Submits query to LLM API
  - Opens result panel automatically

- **LLMQueryOptionsMenuItem.tsx**: Configuration dialog for LLM settings
  - Provider selection: OpenAI, Ollama (local), or a custom OpenAI-compatible endpoint
  - Endpoint URL (hidden for OpenAI; defaults to `http://localhost:11434/v1` for Ollama)
  - API key management (required for OpenAI, optional otherwise)
  - Model selection: a free-text combo box with per-provider suggestions, plus a
    refresh button that lists the models the endpoint reports (`GET /v1/models`,
    i.e. the models pulled into Ollama)
  - Template/prompt selection
  - Template preview and copying

### Result Panel

- **LLMQueryResultPanel.tsx**: Displays query results
  - Shows gene query input field
  - Displays LLM response
  - Provides regenerate button
  - Handles loading states

### API Layer

- **chatgpt.ts**: OpenAI SDK integration
  - Sends messages to the configured endpoint (`baseUrl`; empty means OpenAI)
  - Substitutes a placeholder API key when none is set, because the SDK refuses
    an empty key while Ollama ignores it
  - Lists the endpoint's models for the options dialog
  - Supports mock mode for testing

### Store

- **store/index.ts**: Zustand store for LLM query state
  - Provider, endpoint URL and API key storage
  - Model and template selection
  - Query and result state
  - Loading state
  - `setLLMOptions` (provider, endpoint and model in one change), `hydrateOptions`
    and `clearLLMApiKey`
- **store/llmOptionsPersistence.ts**: reads and writes provider, endpoint and
  model as one `settings` row of `cyweb-profile-db`, validated with zod on read
- **store/llmKeySession.ts**: reads and writes the API keys in sessionStorage
- **store/storageKeys.ts**: the two storage names, in a leaf module so a
  Playwright spec can import them
- **store/useHydrateLLMQueryOptions.ts**: hook that loads the saved options
  when a component that uses them first mounts

### Models

- **LLMModel.ts**: OpenAI model suggestions (the first entry, `gpt-6-luna`, is
  the default)
- **LLMProvider.ts**: Provider definitions (`openai`, `ollama`, `custom`), the
  `isLLMConfigured` gate used by the run buttons, and the placeholder-key rule
- **LLMTemplate.ts**: Prompt templates for different use cases
- **GPTTemplate.ts**: Template function implementations

## Behavior

### Query Execution Flow

1. User selects subsystem nodes in an HCX network
2. User clicks "Run LLM Query" menu item
3. System extracts gene symbols from selected nodes
4. Gene symbols are formatted into a prompt using selected template
5. Query is sent to the configured endpoint with the configured model
6. Response is displayed in result panel
7. User can regenerate response with same or modified query

### Gene Symbol Extraction

- Extracts gene symbols from selected subsystem nodes
- Uses `SubsystemTag.members` or `SubsystemTag.memberNames` attributes
- Requires network to be HCX format
- Fetches gene names from NDEx if needed

### Template System

- Templates are functions that format gene lists into prompts
- Different templates for different analysis types
- Templates can be previewed and copied
- Default template is selected on first use

### Configuration

- Provider, endpoint URL, API key and model are set in the options dialog
- Provider, endpoint URL and model are remembered in this browser; the API key
  is kept for the current tab (see [What Outlives a Reload](#what-outlives-a-reload))
- Any model name can be typed; suggestions come from the provider and from the
  endpoint's model listing
- Model selection affects response quality and cost
- Template selection affects query format

### Local Ollama

- Ollama serves an OpenAI-compatible API at `http://localhost:11434/v1`; the
  browser calls it directly, so CORS applies
- Ollama allows `localhost` and `127.0.0.1` origins on any port by default, so
  the dev server works out of the box
- A deployment served from another host needs Ollama started with
  `OLLAMA_ORIGINS=<that origin>`; the dialog's endpoint help text says so

## Integration Points

- **HierarchyViewer**: Extracts gene symbols from selected subsystem nodes
- **NetworkSummaryStore**: Accesses network metadata
- **TableStore**: Accesses node attributes for gene extraction
- **ViewModelStore**: Accesses selected nodes
- **UiStateStore**: Manages panel state and navigation
- **MessageStore**: Displays status messages and errors
- **NDEx API**: Fetches gene names when needed

## Design Decisions

### HCX Network Requirement

- LLM queries are designed for hierarchical networks
- Subsystem nodes contain gene membership information
- Non-HCX networks don't have required structure

### Default Model

- The default is `gpt-6-luna`: the cheapest OpenAI model that supports
  Structured Outputs and has no shutdown date (checked 2026-10-14). Structured
  Outputs matter beyond the gene set query, since later AI features are
  expected to reuse these settings and need reliable JSON output
- It replaced `gpt-3.5-turbo`, which OpenAI shuts down on 2026-10-23 (#832)
- The suggestion list holds only models OpenAI has not scheduled for shutdown
  (see the [deprecations page](https://developers.openai.com/api/docs/deprecations));
  any other model name can still be typed
- `gpt-6-luna` is a reasoning model, and its reasoning tokens are billed as
  output. The request sends only `model` and `messages`, so it needs no
  reasoning-specific parameters
- The default OpenAI model is saved as "no model", so changing the default
  needs no migration: a user who never picked a model follows the new default.
  A user who picked another model keeps it, and gets the provider's error if
  that model is later retired

### What Outlives a Reload

| What                                | Where                                                | Until                                                                                                                       |
| ----------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Provider, endpoint URL, model       | `cyweb-profile-db`, `settings` row `llmQueryOptions` | The user changes them, or clears this site's data. A workspace reset does not touch them                                    |
| API keys (OpenAI and custom)        | sessionStorage, `cyweb.llm.apiKeys`                  | The tab closes, the user clicks Forget key, or the provider or endpoint the key was entered for is no longer the one in use |
| Prompt template, gene query, result | Memory                                               | The next reload                                                                                                             |

- **Why two places.** The three options are harmless and belong to the browser,
  not to a workspace, so they go in the profile database (#705), which no
  reset path deletes. A key is a credential. IndexedDB and localStorage keep
  it in plaintext on disk with no expiry, readable by every script that ever
  runs in this origin, including third-party apps, which are not sandboxed.
  sessionStorage ends with the tab
- **What sessionStorage does not do.** It does not protect a key from a script
  running in the same tab. The browser calls the provider directly
  (`dangerouslyAllowBrowser`), so the key has to be in the page whenever a
  query runs. "Duplicate tab" copies sessionStorage, and a browser that
  restores a session may restore it
- **Never write a key anywhere else.** Not in the options row, not in
  `cyweb-db`, not in a snapshot, not in `exportApplicationState`. The store
  spec asserts a typed key reaches neither IndexedDB nor localStorage
- **Stored rows are untrusted.** `parseLLMQueryOptions` validates with zod and
  builds a new object from three fields. It also forces the endpoint to the
  OpenAI default whenever the provider is `openai`: both query callers pass
  the stored endpoint whatever the provider, so a row `{ provider: 'openai',
baseUrl: 'https://evil.example/v1' }` would otherwise send the OpenAI key
  to that host. `setLLMOptions` applies the same rule to the store, so the
  pairing cannot exist in memory either
- **What is confirmed can be saved, and what is saved can be read.** The
  dialog, the save and the read share one set of limits (`getEndpointError`
  with `MAX_ENDPOINT_URL_LENGTH`, `getModelNameError` with
  `MAX_MODEL_NAME_LENGTH`). `saveLLMQueryOptions` rejects options the reader
  would not accept and leaves the saved row alone: a row that cannot be read
  back would put the defaults in its place on the next reload
- **Hydration.** IndexedDB is asynchronous, so the store starts on defaults and
  `hydrateOptions` applies the saved row once. It never overwrites a choice
  the user made before the read came back (`optionsHydrated`). The dialog
  re-seeds its form if the read lands while it is open, unless the user has
  already typed in it. Run LLM Query and Regenerate response stay disabled
  until `optionsHydrated`: before it the store holds the defaults (OpenAI,
  the default model), and a query sent then could go to a provider the user
  did not choose
- **Writes** are fire-and-forget from `setLLMOptions`, outside the Immer recipe,
  and do not go through `scheduleWrite`: `suspendWritesUntilReload()` is a
  global switch a workspace reset flips, and it would drop them
- **No cross-tab sync.** Another tab sees changed options after its next reload.
  The options are shared by every tab and the keys are per tab, so that
  reload can meet options another tab changed; `hydrateOptions` applies the
  key rule below for that reason
- **A `config.openAIAPIKey` key is never written to sessionStorage.** It is in
  the bundle already and seeds the store on every load

### API Key Field

- Masked (`type="password"`) and never seeded from the store: a blank field
  means "keep the stored key", so a stored key is never in the DOM
- Sits in a small `<form>` beside a visually hidden `username` input, with
  `autoComplete="current-password"`. That is what a password manager needs
  before it offers to save or fill; whether it does is up to the browser
- **Forget key** acts at once, not on Confirm. It is the only way to remove a
  key without closing the tab, and a user who clicks it and then cancels must
  not be left with the key in place. Every other field waits for Confirm

### A Key Lasts Only While Its Provider and Endpoint Are in Use

- `keysFor` in `store/index.ts` is the rule, applied in `setLLMOptions` and
  in `hydrateOptions`: the OpenAI key stays only while the provider is OpenAI;
  the custom key stays only while the provider is the custom endpoint and the
  endpoint is on the origin the key was entered for. Anything else is
  forgotten, in memory and in sessionStorage
- **Why.** A user who switches provider reasonably thinks the old key is out
  of the picture, the same way the old endpoint and model are (only one
  provider's options are saved). A key that silently stays is exposure they
  no longer know about. For a custom endpoint it is worse: a key kept across
  a change of URL would be sent, on the next query, to a host it was never
  entered for
- **Origin, not URL.** `endpointOrigin` (scheme, host, port) identifies the
  server. `https://host/v1` to `https://host/v2` keeps the key;
  `https://host.evil.test`, another port, or plain HTTP does not
- **The origin is stored beside the key** (`LLMCustomApiKeyOrigin`, and
  `customKeyOrigin` in sessionStorage), not worked out again later, because
  the saved endpoint can change in another tab. `setLLMCustomApiKey` records
  the origin of the endpoint in use, so a caller that changes both sets the
  options first, as the dialog's Confirm does. A stored origin that is not
  exactly an http(s) origin reads as none, which no endpoint matches
- **The dialog says so first.** While the selection differs from what the key
  was entered for, an alert names the key Confirm will forget
  (`llm-query-options-forget-warning`). Cancel keeps the key
- **Before Confirm too.** The dialog's model listing goes to whatever URL is
  in the endpoint field. It sends the stored custom key only while that URL
  is on the key's origin

### API Key Scoping

- Keys are scoped to the provider they were entered for (`selectApiKey`): the
  OpenAI key (`LLMApiKey`, which may be seeded from `config.openAIAPIKey`) is
  sent to OpenAI only, the custom endpoint has its own `LLMCustomApiKey`, and
  Ollama is never sent a key, so the dialog hides the key field for it
- A blank key never falls back to another provider's key; the dialog's model
  refresh and both query callers all go through `selectApiKey`
- `getEndpointError` refuses to send a real key over plain HTTP to a
  non-loopback host. Plain HTTP stays allowed on loopback (a local Ollama) and
  for keyless requests to a LAN host, where no credential is exposed. The
  check runs in the API client before the SDK client is built, and the dialog
  shows the same error on the endpoint field and disables Confirm

### Dialog Form State

- `AnalysisMenu` keeps `LLMQueryOptionsDialog` mounted and only toggles `open`,
  so the exported component is a thin wrapper that re-keys the real dialog on
  every open. The fields re-seed from the store each time, and edits abandoned
  with Cancel are discarded; nothing reaches the store until Confirm
- Closing the dialog also abandons a model listing that is still in flight, so
  neither its result nor its status toast appears after the user has left
- The dialog body stays one component on purpose: `dialogPolicy.test.ts` looks
  for the Cancel control lexically inside the `<CyDialog>` block

### Provider Gating

- The run buttons are enabled when OpenAI has a key, or when any other provider
  has an endpoint URL; the key alone is no longer the "configured" signal

### Template System

- Flexible template system allows different query types
- Templates are functions for dynamic formatting
- Preview helps users understand query format

### Result Panel Integration

- Result panel opens automatically after query
- Integrated into left panel navigation
- Can be accessed independently for regeneration

## Future Improvements

- Support for providers without an OpenAI-compatible API (Anthropic, etc.)
- An opt-in "Remember on this device" for the API key, encrypted with a
  passkey (WebAuthn PRF) or a passphrase
- Query history and saved queries
- Custom template creation
- Batch query processing
- Result export and sharing
- Integration with network analysis workflows
