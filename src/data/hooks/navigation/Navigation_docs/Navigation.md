# Navigation Hooks

## Overview

This directory provides URL-driven navigation utilities and hooks that encode, decode, and synchronize application state with the browser URL. It enables deep-linking, back/forward navigation, and shareable stateful links across the app.

## Architecture

Navigation is organized around a small set of modules:

- `urlManager.ts`: Core URL state encode/decode and mutation utilities
- `useUrlNavigation.ts`: Hook wrapper that exposes imperative navigation helpers
- `NavigationFunctions.ts`: Typed function surface for common navigation actions
- `NavigationConfig.ts`: Centralized route/param configuration

The flow:

1. Features call navigation helpers from the hook or functions
2. Helpers compute the next URL based on current app state and config
3. `urlManager` encodes state into query/hash segments
4. Browser history is updated and listeners propagate changes

## Behavior

### URL State Synchronization

- Encodes selected network, view, table, panels, and other UI state
- Decodes incoming URLs to restore state on load
- Keeps history consistent for back/forward usage

### Declarative APIs

- High-level functions for common transitions (open network, toggle panel, select table row, etc.)
- Guards and normalization applied before updating the URL

### React Integration

- `useUrlNavigation` exposes callbacks and derived params
- Subscribes to URL changes and translates them to store updates
- Avoids infinite loops by comparing computed state and current URL

## Integration Points

- `stores/*`: Applies decoded URL state to domain/UI stores
- `features/*`: Features consume the hook to navigate without hand-coding URLs
- `init/tabManager.ts`: Coordinates multi-tab/session behavior as needed

## Design Decisions

### Single Source of Truth for URL Logic

- All encoding/decoding lives in `urlManager` for consistency and testability

### Typed, Intent-Based Functions

- `NavigationFunctions` describes what the user intends (e.g., open view) rather than how to build the URL

### Non-Intrusive

- Feature components remain agnostic of URL details
- URL changes are side effects with strict guards and idempotent application

## Future Improvements

- Expand schema validation for URL params
- Improve error reporting for malformed links
- Add unit tests for round-trip encode/decode invariants
- Consider versioned URL schemas for long-term compatibility
