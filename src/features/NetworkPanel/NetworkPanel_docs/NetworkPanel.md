# NetworkPanel Component

## Overview

`NetworkPanel` is the main component responsible for displaying network visualizations. It handles loading states, network rendering, and coordinates between different renderer views.

## Behavior

### Loading States

The component manages several loading states to provide smooth user experience:

1. **Workspace Initialization**: When the workspace hasn't been initialized yet (`workspace.id === ''`), shows "Loading network data..." instead of "No network selected" to prevent flickering during initial load.

2. **Network Loading**: When a `networkId` is provided but the network isn't in the store yet, shows "Loading network data..." until the network is loaded.

3. **Empty State**: When workspace is initialized but no network is selected or available, shows "No network selected".

4. **Failed Load**: When `failedToLoad` prop is true, shows "Failed to load network data".

### State Priority

The component checks states in the following order:

1. Failed load state (if `failedToLoad` is true)
2. Network loading (if `networkId` is provided but network not in store)
3. Workspace initialization (if `workspace.id === ''`)
4. Empty state (if workspace initialized but no networks)
5. Network rendering (if network is loaded)

### Design Decisions

**Smooth Loading Experience**: The component prioritizes checking if a `networkId` is provided before checking workspace state. This prevents the "No network selected" message from flashing during initial load when a network is being loaded.

**Workspace Initialization Detection**: By checking `workspace.id === ''`, the component can distinguish between:

- Workspace still initializing (show loading)
- Workspace initialized but empty (show empty state)

This prevents confusing empty state messages from appearing before the workspace has finished loading.

### Active State Management

The component manages an `isActive` state that determines which network panel is currently active (shown with an orange border). This state is synchronized with the global `activeNetworkView` from `UiStateStore`.

**Activation Logic:**

- A panel becomes active when `networkId === activeNetworkView` and `enablePopup` is true
- Only one panel can be active at a time (ensured by exact ID matching)
- The `isActive` state is managed via a `useEffect` that watches `activeNetworkView`, `networkId`, and `enablePopup`
- When a tab is clicked in `NetworkTabs`, it calls `handleClick()` which sets `activeNetworkView` to the network's ID, triggering the `useEffect` to update `isActive`

**Design Decision:**

- Previously, when `activeNetworkView === ''`, all panels would become active. This was changed to only activate when there's an exact match, ensuring only one panel is active at a time and preventing race conditions.

## Integration Points

- **NetworkStore**: Retrieves network data
- **WorkspaceStore**: Checks workspace initialization status and network availability
- **RendererStore**: Gets available renderers
- **ViewModelStore**: Gets network views
- **VisualStyleStore**: Gets visual styles for network background
- **UiStateStore**: Manages `activeNetworkView` state that controls which panel is active
