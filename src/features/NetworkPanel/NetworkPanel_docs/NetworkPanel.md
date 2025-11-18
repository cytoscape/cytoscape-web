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

## Integration Points

- **NetworkStore**: Retrieves network data
- **WorkspaceStore**: Checks workspace initialization status and network availability
- **RendererStore**: Gets available renderers
- **ViewModelStore**: Gets network views
- **VisualStyleStore**: Gets visual styles for network background

