# FeatureAvailability Documentation

## Overview

The `FeatureAvailability` module provides a React Context-based system for detecting and tracking the availability of external features and services. Currently, it monitors:

1. **Cytoscape Desktop Availability** - Checks if Cytoscape Desktop is running locally and accessible
2. **Browser Compatibility** - Detects Safari browser (which doesn't support certain features)

This module uses a **stateful polling approach** where the provider continuously checks feature availability and updates the context state accordingly. Components can access this state through the `useFeatureAvailability` hook to conditionally enable/disable features and show appropriate tooltips.

## Architecture

### State Management Pattern

The module uses a **reducer pattern** with React's `useReducer` hook to manage state:

- **State**: Tracks availability flags (`isCyDeskAvailable`, `isSafari`)
- **Actions**: Dispatched to update state based on polling results and browser detection
- **Reducer**: Pure function that transforms state based on action types

### Polling Mechanism

The provider implements a **polling-based detection system**:

- Polls the Cytoscape Desktop endpoint (`http://127.0.0.1:1234/v1/version`) every 5 seconds
- Uses `AbortController` to properly clean up fetch requests on unmount
- Handles network errors gracefully (sets unavailable on errors, ignores `AbortError`)
- Skips polling entirely when Safari is detected (since the feature isn't supported)

### Browser Detection

Browser detection happens once on mount:

- Checks `navigator.userAgent` to detect Safari
- Distinguishes Safari from Chrome (which also includes "safari" in user agent)
- Sets initial state and skips polling if Safari is detected

## Components

### `FeatureAvailabilityProvider`

React Context Provider component that wraps the application and provides feature availability state.

**Props:**

- `children: ReactNode` - Child components that need access to feature availability

**Behavior:**

- Initializes state with `initialState` (both flags set to `false`)
- Detects browser on mount
- Starts polling interval (if not Safari) that checks Cytoscape Desktop availability
- Computes tooltip message based on current state
- Cleans up polling interval and aborts fetch requests on unmount

**Usage:**

```tsx
<FeatureAvailabilityProvider>
  <App />
</FeatureAvailabilityProvider>
```

### `useFeatureAvailability` Hook

Custom hook that provides access to the feature availability context.

**Returns:**

```typescript
{
  state: FeatureAvailabilityState
  tooltip: string
}
```

**State Properties:**

- `isCyDeskAvailable: boolean` - Whether Cytoscape Desktop is running and accessible
- `isSafari: boolean` - Whether the current browser is Safari

**Tooltip:**

- Dynamically generated message explaining feature availability
- Changes based on current state:
  - Safari: "This feature is not available in Safari."
  - Cytoscape Desktop unavailable: "To use this feature, you need Cytoscape running 3.8.0 or higher on your machine (default port 1234)."
  - Available: "Open a copy of the current network in Cytoscape Desktop."

**Usage:**

```tsx
const { state, tooltip } = useFeatureAvailability()

// Disable button when feature is unavailable
<Button disabled={!state.isCyDeskAvailable} title={tooltip}>
  Open in Cytoscape Desktop
</Button>
```

## API Reference

### Types

#### `FeatureAvailabilityState`

```typescript
type FeatureAvailabilityState = {
  isCyDeskAvailable: boolean
  isSafari: boolean
}
```

#### `FeatureAvailabilityActionType`

Action types for the reducer:

- `SET_CYDESK_AVAILABLE` - Set Cytoscape Desktop as available
- `SET_CYDESK_UNAVAILABLE` - Set Cytoscape Desktop as unavailable
- `SET_IS_SAFARI` - Set browser as Safari
- `SET_NOT_SAFARI` - Set browser as not Safari

#### `FeatureAvailabilityAction`

```typescript
type FeatureAvailabilityAction = {
  type: FeatureAvailabilityActionType
  payload?: any
}
```

### Constants

#### `initialState`

Default state with both flags set to `false`:

```typescript
const initialState: FeatureAvailabilityState = {
  isCyDeskAvailable: false,
  isSafari: false,
}
```

#### `CYTOSCAPE_ENDPOINT`

Cytoscape Desktop version endpoint URL: `'http://127.0.0.1:1234/v1/version'`

**Note:** This is currently hardcoded but could be made configurable in the future.

#### `POLLING_INTERVAL_MS`

Polling interval in milliseconds: `5000` (5 seconds)

**Note:** This is currently hardcoded but could be made configurable in the future.

#### `featureAvailabilityReducer`

Exported reducer function for state management. Can be used directly for testing or in other contexts.

## Usage Examples

### Basic Usage

```tsx
import {
  FeatureAvailabilityProvider,
  useFeatureAvailability,
} from './features/FeatureAvailability'

function App() {
  return (
    <FeatureAvailabilityProvider>
      <MyComponent />
    </FeatureAvailabilityProvider>
  )
}

function MyComponent() {
  const { state, tooltip } = useFeatureAvailability()

  return (
    <Tooltip title={tooltip}>
      <Button disabled={!state.isCyDeskAvailable}>
        Open in Cytoscape Desktop
      </Button>
    </Tooltip>
  )
}
```

### Conditional Feature Rendering

```tsx
function FeatureButton() {
  const { state } = useFeatureAvailability()

  if (state.isSafari) {
    return <Alert>This feature is not available in Safari</Alert>
  }

  return <Button disabled={!state.isCyDeskAvailable}>Use Feature</Button>
}
```

### Real-World Example

See `src/features/FloatingToolBar/OpenInCytoscapeButton.tsx` and `src/features/ToolBar/DataMenu/OpenNetworkInCytoscapeMenuItem.tsx` for complete implementation examples.

## Design Decisions

### Why Polling?

- **Real-time Updates**: Users may start/stop Cytoscape Desktop while the app is running
- **User Experience**: Features should become available immediately when Cytoscape Desktop starts
- **Simplicity**: Polling is straightforward and doesn't require complex event systems

### Why 5 Second Interval?

- **Balance**: Frequent enough to feel responsive, not so frequent as to cause performance issues
- **Network Friendly**: Doesn't overwhelm the local endpoint
- **User Experience**: 5 seconds is acceptable delay for feature availability changes

### Why Skip Polling in Safari?

- **Performance**: No point in polling if the feature will never be available
- **Resource Efficiency**: Saves network requests and processing
- **Clear Intent**: Makes it obvious that Safari is a hard blocker

### Why AbortController?

- **Cleanup**: Properly cancels in-flight requests when component unmounts
- **Memory Leaks**: Prevents memory leaks from unresolved promises
- **Best Practice**: Standard pattern for canceling fetch requests

## Error Handling

### Network Errors

- Network failures set `isCyDeskAvailable` to `false`
- Errors are caught and handled gracefully
- No error messages are shown to users (state reflects unavailability)

### AbortError

- `AbortError` is ignored (doesn't dispatch unavailable action)
- This prevents state updates during cleanup
- Ensures clean unmounting behavior

### Browser Detection

- Browser detection happens synchronously on mount
- No error handling needed (user agent is always available)
- Falls back to "not Safari" if detection fails

## Limitations

1. **Hardcoded Endpoint**: The Cytoscape Desktop endpoint is hardcoded to `http://127.0.0.1:1234/v1/version`
2. **Single Feature**: Currently only tracks Cytoscape Desktop availability
3. **No Retry Logic**: Failed polls don't have exponential backoff or retry logic
4. **Browser Detection**: Simple string matching on user agent (could be spoofed)

## Future Enhancements

Potential improvements for this module:

1. **Configurable Endpoint**: Allow endpoint URL to be configured
2. **Multiple Features**: Extend to track other external services (NDEx, service apps, etc.)
3. **Retry Logic**: Add exponential backoff for failed polls
4. **Event-Based Updates**: Consider WebSocket or other event-based approaches for real-time updates
5. **Browser Feature Detection**: Detect other browser capabilities (WebGL, WebAssembly, etc.)
6. **Network Status**: Track online/offline status

## Testing

See `FeatureAvailability.test.tsx` for comprehensive test coverage including:

- Reducer logic tests
- Browser detection tests
- Polling behavior tests
- Error handling tests
- Tooltip generation tests
- Cleanup tests

## Related Files

- `FeatureAvailabilityContext.ts` - Context definition and types
- `FeatureAvailabilityProvider.tsx` - Provider implementation
- `index.ts` - Public exports
- `FeatureAvailability.test.tsx` - Test suite

## References

- Used by: `OpenInCytoscapeButton`, `OpenNetworkInCytoscapeMenuItem`
- Integrated in: `src/init.tsx` (wraps the entire app)
