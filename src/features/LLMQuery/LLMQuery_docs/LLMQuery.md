# LLMQuery Feature

## Overview

The LLMQuery feature integrates Large Language Model (LLM) capabilities to analyze gene sets from hierarchical networks. It allows users to query LLMs (like OpenAI's GPT models) with gene symbols extracted from selected subsystem nodes in HCX (Hierarchical Cell eXchange) networks. The feature provides a menu item to run queries and a result panel to display and regenerate responses.

## Architecture

The LLMQuery feature consists of:
- **Menu Items**: Entry points for running queries and configuring options
- **Result Panel**: Displays query results and allows regeneration
- **API Layer**: Handles communication with OpenAI API
- **Store**: Manages LLM query state (API key, model, template, results)

## Component Structure

### Menu Components
- **RunLLMQueryMenuItem.tsx**: Menu item that triggers LLM queries
  - Extracts gene symbols from selected subsystem nodes
  - Validates HCX network requirements
  - Submits query to LLM API
  - Opens result panel automatically

- **LLMQueryOptionsMenuItem.tsx**: Configuration dialog for LLM settings
  - API key management
  - Model selection (GPT-3.5, GPT-4, etc.)
  - Template/prompt selection
  - Template preview and copying

### Result Panel
- **LLMQueryResultPanel.tsx**: Displays query results
  - Shows gene query input field
  - Displays LLM response
  - Provides regenerate button
  - Handles loading states

### API Layer
- **chatgpt.ts**: OpenAI API integration
  - Sends messages to OpenAI API
  - Handles API responses
  - Supports mock mode for testing

### Store
- **store/index.ts**: Zustand store for LLM query state
  - API key storage
  - Model and template selection
  - Query and result state
  - Loading state

### Models
- **LLMModel.ts**: Available LLM models
- **LLMTemplate.ts**: Prompt templates for different use cases
- **GPTTemplate.ts**: Template function implementations

## Behavior

### Query Execution Flow
1. User selects subsystem nodes in an HCX network
2. User clicks "Run LLM Query" menu item
3. System extracts gene symbols from selected nodes
4. Gene symbols are formatted into a prompt using selected template
5. Query is sent to OpenAI API with configured model
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
- API key can be set in options dialog
- API key is stored in store (not persisted to server)
- Model selection affects response quality and cost
- Template selection affects query format

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

### Template System
- Flexible template system allows different query types
- Templates are functions for dynamic formatting
- Preview helps users understand query format

### Result Panel Integration
- Result panel opens automatically after query
- Integrated into left panel navigation
- Can be accessed independently for regeneration

## Future Improvements

- Support for other LLM providers (Anthropic, etc.)
- Query history and saved queries
- Custom template creation
- Batch query processing
- Result export and sharing
- Integration with network analysis workflows

