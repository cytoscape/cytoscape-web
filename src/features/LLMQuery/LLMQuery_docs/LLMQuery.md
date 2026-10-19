# LLMQuery Feature

## Overview

The LLMQuery feature integrates Large Language Model (LLM) capabilities to analyze gene sets from hierarchical networks. It allows users to query LLMs (OpenAI's GPT models, a local Ollama server, any OpenAI-compatible endpoint, or an experimental in-browser model run by WebLLM on WebGPU) with gene symbols extracted from selected subsystem nodes in HCX (Hierarchical Cell eXchange) networks. The feature provides a menu item to run queries and a result panel to display and regenerate responses.

## Architecture

The LLMQuery feature consists of:

- **Menu Items**: Entry points for running queries and configuring options
- **Result Panel**: Displays query results and allows regeneration
- **API Layer**: Handles communication with an OpenAI-compatible chat completions API, or with the in-browser WebLLM engine in a Web Worker
- **Store**: Manages LLM query state (provider, endpoint, API key, model, template, results, in-browser model load status)

## Component Structure

### Menu Components

- **RunLLMQueryMenuItem.tsx**: Menu item that triggers LLM queries
  - Extracts gene symbols from selected subsystem nodes
  - Validates HCX network requirements
  - Submits query to LLM API
  - Opens result panel automatically

- **LLMQueryOptionsMenuItem.tsx**: Configuration dialog for LLM settings
  - Provider selection: OpenAI, Ollama (local), a custom OpenAI-compatible
    endpoint, or WebLLM (in-browser, experimental)
  - Endpoint URL (only for Ollama and custom; defaults to
    `http://localhost:11434/v1` for Ollama)
  - API key management (required for OpenAI, optional for custom, absent for
    Ollama and WebLLM)
  - Model selection: a free-text combo box with per-provider suggestions, plus a
    refresh button that lists the models the endpoint reports (`GET /v1/models`,
    i.e. the models pulled into Ollama). For WebLLM it is a fixed selector of the
    curated models instead (see [In-browser models (WebLLM)](#in-browser-models-webllm))
  - Template/prompt selection
  - Template preview and copying

### Result Panel

- **LLMQueryResultPanel.tsx**: The LLM QUERY tab of the left pane, present
  on every network (see [Panel Setup States](#panel-setup-states))
  - Shows gene query input field
  - Displays LLM response
  - Provides regenerate button
  - Handles loading states
  - Tells the user what blocks a query and how to fix it: no provider set up
    (with a **Select LLM Provider** button that opens the options dialog), an
    in-browser model still loading (progress bar), or one that failed to load
    (with a button back to the options dialog)

### API Layer

- **chatgpt.ts**: OpenAI SDK integration
  - Sends messages to the configured endpoint (`baseUrl`; empty means OpenAI)
  - Substitutes a placeholder API key when none is set, because the SDK refuses
    an empty key while Ollama ignores it
  - Lists the endpoint's models for the options dialog
  - Supports mock mode for testing
- **queryLLM.ts**: The one entry point both run buttons call; sends WebLLM
  queries to the browser engine and everything else to `chatgpt.ts`
- **webgpu.ts**: The WebGPU support check (secure page, `navigator.gpu`, a
  non-null adapter, `shader-f16`), run once per session
- **webllm.ts**: Owns the single WebLLM engine and its Web Worker
  (`webllm.worker.ts`): load, query, unload. Framework-agnostic
- **webllmSession.ts**: Ties `webllm.ts` to the store and toasts: starts a
  background load, tracks its status, and computes the run buttons' gate

### Store

- **store/index.ts**: Zustand store for LLM query state
  - Provider, endpoint URL and API key storage
  - Model and template selection
  - Query and result state
  - Loading state
  - `webLLMStatus`: `idle`, `loading` (progress 0..1 and WebLLM's stage text),
    `ready`, or `error`, each naming the model

### Models

- **LLMModel.ts**: OpenAI model suggestions (the first entry, `gpt-6-luna`, is
  the default)
- **LLMProvider.ts**: Provider definitions (`openai`, `ollama`, `custom`,
  `webllm`), the `isLLMConfigured` gate used by the run buttons, and the
  placeholder-key rule
- **WebLLMModel.ts**: The curated in-browser models with their pinned
  artifacts and integrity hashes, the WebLLM `AppConfig`, and the
  `WebLLMStatus` type
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
- API key is stored in store (not persisted to server)
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

### In-browser models (WebLLM)

Experimental. [WebLLM](https://webllm.mlc.ai/) (`@mlc-ai/web-llm`, pinned
to an exact version) runs a small model on the user's GPU through WebGPU, so
prompts never leave the machine and no key or server is needed.

- **WebGPU check**: choosing WebLLM in the dialog runs `getWebGPUSupport()`.
  It requires a secure page, `navigator.gpu`, and a non-null adapter from
  `requestAdapter()` (the API can exist with no usable GPU). Until it answers
  the dialog shows a "checking" notice; if unsupported it shows the reason and
  disables the model selector and Confirm. Cancel always works
- **Model builds**: a GPU with `shader-f16` is offered the `q4f16` builds
  (less GPU memory), any other GPU the `q4f32` builds; Phi-3.5 has no f32
  build in the list. The f16 records declare `required_features:
['shader-f16']`, which WebLLM's own prebuilt records omit, so a mismatch
  fails before the weights download
- **Curated list**: Qwen2.5 3B (default), Llama 3.2 3B, Phi-3.5 mini and
  Qwen2.5 1.5B Instruct, each shown with its download size and GPU memory.
  Smaller models were left out because they answer the gene-set prompt
  poorly; Qwen3 was left out because it emits "thinking" text into the answer.
  The engine's `AppConfig` contains only these models
- **Background loading**: Confirm saves the settings, closes the dialog, opens
  the LLM Query panel and starts the load in a Web Worker, so downloading,
  shader compilation and generation never block the network view. The panel
  shows a progress bar (store updates are throttled to whole-percent changes),
  toasts announce the start, the end and failures, and the run buttons stay
  disabled with a tooltip saying why until the model is `ready`. Re-confirming
  a failed model retries it
- **One model at a time**: choosing another model terminates the worker
  (aborting a load in flight) and starts a new one; confirming any other
  provider unloads the model to free GPU memory. Downloads stay in the
  browser's Cache API, so a later load skips the download but still compiles
- **Errors**: errors cross the worker boundary as plain messages and are
  matched by text. A prompt over the 4,096-token context window gets an
  explanation (select fewer genes); a lost GPU device (usually out of memory)
  drops the engine and marks the model failed
- **Pinned artifacts**: WebLLM's defaults fetch weights from Hugging Face's
  `main` branch and the compiled WebGPU library (code the browser executes)
  from the `main` branch of `mlc-ai/binary-mlc-llm-libs`. Here every weight
  repository is pinned to a Hugging Face commit and the library to a commit
  of that repository, and the library, `mlc-chat-config.json` and
  `tokenizer.json` carry SHA-384 SRI hashes that WebLLM verifies before use
  (`onFailure: 'error'`). Weight shards are data and are not hashed
- **Hosts**: loads contact `huggingface.co` (and its CDN redirects) and
  `raw.githubusercontent.com`. A deployment with a Content Security Policy
  must allow them in `connect-src`
- **Bundle**: nothing loads until a WebLLM load starts. The worker is its own
  ~6 MB chunk, and the main-thread engine client (the same library) is a
  second lazy ~6 MB chunk; the eager menu chunk holds only the small model
  catalog, the WebGPU check and the session glue
- **Testing**: unit tests stub `navigator.gpu`, the Worker and the engine;
  the e2e spec stubs `navigator.gpu` and blocks the model hosts, so no test
  downloads a model

To update the pinned models: read the new commit SHAs (Hugging Face API
`/api/models/mlc-ai/<model_id>`, GitHub API for
`mlc-ai/binary-mlc-llm-libs`), check the library file names in WebLLM's
`prebuiltAppConfig` for the installed version, download each pinned
`mlc-chat-config.json`, `tokenizer.json` and `.wasm`, and recompute every hash
with `openssl dgst -sha384 -binary <file> | openssl base64 -A` (prefix
`sha384-`). `WebLLMModel.test.ts` checks that every URL is pinned and every
hash is well formed, not that it matches.

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

- The **Run LLM Query** menu item needs a hierarchy (HCX) network: it takes the
  genes from the selected subsystem nodes, which only HCX networks have
- The LLM QUERY tab does not: it is present on every network, since a gene
  list can be typed into it, and it is where a provider is set up. Until
  2026-10 it was shown only for HCX networks

### Panel Setup States

The panel derives one state from the provider settings and, for WebLLM, the
model's load status:

| State                                                                                                | Shown                                     | Gene Query                                       | Regenerate                          |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| Not configured (`isLLMConfigured` is false: OpenAI without a key, Ollama/custom without an endpoint) | Explanation and **Select LLM Provider**   | Disabled                                         | Disabled                            |
| WebLLM model loading                                                                                 | Progress bar and stage text               | Editable, so the list is ready when the model is | Disabled                            |
| WebLLM model failed, or not loaded                                                                   | The reason and **Open LLM Query Options** | Disabled                                         | Disabled                            |
| Ready                                                                                                | Nothing                                   | Editable                                         | Enabled when the query is not empty |

- "No provider" is the not-configured state, not a separate provider id: the
  store still defaults to OpenAI, so a deployment that sets
  `config.openAIAPIKey` is configured from the start and never shows the
  notice
- The model name is hidden while nothing is configured, since the default
  model means nothing without a provider

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
- The settings are not persisted, so changing the default needs no migration

### API Key Storage

- API key stored in client-side store
- Not persisted to server for security
- User must enter key each session (or use config)

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

- Whether the dialog is open lives in the LLM query store
  (`optionsDialogOpen`), so both the Analysis menu item and the panel's
  buttons can open it. `AnalysisMenu`, which the toolbar always mounts, renders
  the one dialog outside the menu rows (rows unmount with the menu, #784)
- `AnalysisMenu` keeps `LLMQueryOptionsDialog` mounted and only toggles `open`,
  so the exported component is a thin wrapper that re-keys the real dialog on
  every open. The fields re-seed from the store each time, and edits abandoned
  with Cancel are discarded; nothing reaches the store until Confirm
- Closing the dialog also abandons a model listing that is still in flight, so
  neither its result nor its status toast appears after the user has left
- The dialog body stays one component on purpose: `dialogPolicy.test.ts` looks
  for the Cancel control lexically inside the `<CyDialog>` block

### Provider Gating

- The run buttons are enabled when OpenAI has a key, or when an endpoint
  provider has an endpoint URL; the key alone is no longer the "configured"
  signal
- WebLLM counts as configured, but the run buttons also wait for the chosen
  model's status to be `ready` (`getWebLLMBlocker`), and their tooltip shows
  the load progress or the failure

### Template System

- Flexible template system allows different query types
- Templates are functions for dynamic formatting
- Preview helps users understand query format

### Result Panel Integration

- Result panel opens automatically after query
- Integrated into left panel navigation as the always-present LLM QUERY tab
  (`listLeftPanelTabs`, which `window.CyWebApi.panel` also resolves against)
- Can be accessed independently for regeneration

## Future Improvements

- Support for providers without an OpenAI-compatible API (Anthropic, etc.)
- Persist the provider and endpoint choice across sessions. Matters more with
  WebLLM, which a user must re-select (and the browser re-compile) each session
- WebLLM: show which models are already downloaded (`hasModelInCache`) and
  offer to delete them; host the model library ourselves; cancel a load from
  the panel; use JSON mode (`response_format`) once a query needs structured
  output
- Query history and saved queries
- Custom template creation
- Batch query processing
- Result export and sharing
- Integration with network analysis workflows
