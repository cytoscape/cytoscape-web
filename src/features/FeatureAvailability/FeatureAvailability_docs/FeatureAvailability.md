# FeatureAvailability Documentation

## Overview

The `FeatureAvailability` module provides a React Context-based system for detecting and tracking the availability of external features and services. It enables components to conditionally enable/disable features based on runtime availability checks.

Currently monitors:

- **Cytoscape Desktop Availability** - Detects if Cytoscape Desktop is running locally
- **Browser Compatibility** - Identifies Safari browser (which doesn't support certain features)

## Purpose

This module solves the problem of **dynamic feature availability** - features that may or may not be available depending on:

- External services running (Cytoscape Desktop)
- Browser capabilities (Safari limitations)
- Runtime conditions

Instead of hardcoding feature availability, components can reactively respond to changes in availability state.

## Architecture

The module follows a **separation of concerns** pattern:

- **Polling Hook** - Contains business logic (polling, state management, browser detection)
- **Provider** - Wraps the application and provides context
- **Context Hook** - Consumes the context in components

This separation improves testability and maintainability.

## How It Works

### Polling Mechanism

The module uses a **polling-based detection system** that:

- Checks Cytoscape Desktop availability every 5 seconds
- Updates state when availability changes
- Handles network errors gracefully
- Skips polling when features are permanently unavailable (e.g., Safari)

### State Management

Tracks two availability flags:

- `isCyDeskAvailable` - Whether Cytoscape Desktop is running and accessible
- `isSafari` - Whether the current browser is Safari

State updates automatically as conditions change, and components using the context will re-render accordingly.

### Browser Detection

Browser detection happens once on mount to identify Safari, which has known limitations. When Safari is detected, polling is skipped entirely since the feature will never be available.

## Usage

### Setup

Wrap your application with the `FeatureAvailabilityProvider` component to enable feature availability tracking throughout the app.

### In Components

Components use the `useFeatureAvailability` hook to access:

- **State** - Availability flags (`isCyDeskAvailable`, `isSafari`) for conditional logic
- **Tooltip** - Pre-generated message explaining why a feature is unavailable

Components can then conditionally enable/disable features and show appropriate tooltips based on the current availability state.

### Examples

See `OpenInCytoscapeButton` and `OpenNetworkInCytoscapeMenuItem` for complete implementation examples.

## Design Decisions

### Why Polling?

The module uses polling rather than event-based detection because:

- Users may start/stop Cytoscape Desktop while the app is running
- Features should become available immediately when services start
- Polling is simpler than complex event systems
- 5-second interval balances responsiveness with performance

### Why Skip Polling in Safari?

When Safari is detected, polling is skipped entirely because:

- The feature will never be available in Safari
- Saves unnecessary network requests
- Makes the limitation clear and explicit

### Error Handling

The module handles errors gracefully:

- Network failures result in "unavailable" state (no error messages shown)
- AbortErrors during cleanup are ignored
- Browser detection is synchronous and safe

## Limitations

1. **Hardcoded Endpoint**: Cytoscape Desktop endpoint is currently hardcoded
2. **Single Feature**: Currently only tracks Cytoscape Desktop availability
3. **No Retry Logic**: Failed polls don't have exponential backoff
4. **Simple Browser Detection**: Uses user agent string matching

## Future Enhancements

Potential improvements:

- Configurable endpoints
- Track multiple external services (NDEx, service apps, etc.)
- Retry logic with exponential backoff
- Event-based updates (WebSocket)
- Additional browser capability detection
- Network status tracking

## Testing

The module uses a two-level testing strategy:

- **Hook Tests**: Test business logic independently
- **Provider Tests**: Test context provision and integration

See `FeatureAvailability.test.tsx` for comprehensive test coverage.

## Related Files

- `FeatureAvailabilityContext.ts` - Context definition
- `useFeatureAvailabilityPolling.ts` - Polling logic and state management
- `FeatureAvailabilityProvider.tsx` - Provider implementation
- `FeatureAvailability.test.tsx` - Test suite

## Integration

- **Used by**: `OpenInCytoscapeButton`, `OpenNetworkInCytoscapeMenuItem`
- **Integrated in**: `src/init.tsx` (wraps the entire app)
