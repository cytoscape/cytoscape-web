# LLMQuery Feature

## Overview

The LLMQuery feature integrates Large Language Model (LLM) capabilities to analyze gene sets from hierarchical networks. It allows users to query LLMs (OpenAI's GPT models, a local Ollama server, or any OpenAI-compatible endpoint) with gene symbols extracted from selected subsystem nodes in HCX (Hierarchical Cell eXchange) networks. The feature provides a menu item to run queries and a result panel to display and regenerate responses.

## Architecture

The LLMQuery feature consists of:

- **Menu Items**: Entry points for running queries and configuring options
- **Result Panel**: Displays query results and allows regeneration
- **API Layer**: Handles communication with an OpenAI-compatible chat completions API
- **Store**: Manages LLM query state (provider, endpoint, API key, model, template, results)

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

### Models

- **LLMModel.ts**: OpenAI model suggestions (the first entry is the default)
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
- Persist the provider and endpoint choice across sessions
- Query history and saved queries
- Custom template creation
- Batch query processing
- Result export and sharing
- Integration with network analysis workflows
