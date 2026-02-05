# AnalysisMenu Feature

## Overview

The `AnalysisMenu` feature adds an **Analysis** entry to the main toolbar that focuses on LLM-driven analysis workflows. It provides quick access to running LLM queries on selected data and configuring LLM options (model, prompt templates, API keys).

## Architecture

- **UI Layer**
  - `AnalysisMenu.tsx`: Renders the top-level "Analysis" button and a PrimeReact `OverlayPanel` containing a `TieredMenu`.
- **LLM Integration**
  - **`RunLLMQueryMenuItem`**: Starts an LLM query based on the current selection/context.
  - **`LLMQueryOptionsMenuItem`**: Opens a dialog to configure LLM model, API key, and prompt templates.

The menu is intentionally thin: it delegates all domain-specific behavior to the LLMQuery feature and acts as a launcher.

## Behavior

- **Opening the menu**
  - Clicking the **Analysis** button toggles a PrimeReact `OverlayPanel` attached to the button.
  - The panel contains a `TieredMenu` with items for running a query and opening options.

- **Menu items**
  - **Run LLM Query**: Opens the LLM query UI to send gene lists or other domain data to the configured LLM.
  - **LLM Query Options**: Opens a configuration dialog for model selection, API key, and templates.

- **Closing behavior**
  - All menu items receive a `handleClose` callback from `AnalysisMenu`, ensuring the overlay is closed after an action is triggered.

## Design Decisions

- **PrimeReact TieredMenu**
  - Chosen for consistency with other toolbar menus (Data, Tools, etc.).
  - Supports templated items, allowing complex React components instead of simple text.

- **Delegation to LLMQuery feature**
  - Keeps AnalysisMenu itself small and focused on wiring.
  - All domain logic (models, prompts, API calls) lives in the LLMQuery feature, improving testability and separation of concerns.

## Future Improvements

- Add more analysis actions (e.g., enrichment analysis, clustering) as additional menu items.
- Group LLM-related items under a sub-menu if the list grows.
- Add shortcuts or recent-queries history.
