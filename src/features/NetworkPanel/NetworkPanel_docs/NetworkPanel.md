# NetworkPanel Component

## Overview

`NetworkPanel` is the main component responsible for displaying network visualizations. It handles loading states, network rendering, and coordinates between different renderer views.

## Behavior

### Loading States

The component manages several loading states to provide smooth user experience:

1. **Workspace Initialization**: When the workspace hasn't been initialized yet (`workspace.id === ''`), shows "Loading network data..." instead of "No network selected" to prevent flickering during initial load.

2. **Network Loading**: When a `networkId` is provided but the network isn't in the store yet, shows "Loading network data..." until the network is loaded.

3. **Empty Workspace**: When the workspace is initialized but holds no networks (`workspace.networkIds.length === 0`), renders `EmptyWorkspacePanel` — the call to action described below — instead of a bare message.

4. **No Selection**: When the workspace has networks but none is current (`networkId === ''`), shows "Select a network" with a hint pointing at the workspace panel (`data-testid="no-network-selected-panel"`). A "load a network" call to action would be the wrong copy here, so the two states are deliberately distinct.

5. **Failed Load**: When `failedToLoad` prop is true, shows "Failed to load network data".

### State Priority

The component checks states in the following order:

1. Failed load state (if `failedToLoad` is true)
2. Network loading (if `networkId` is provided but network not in store)
3. Workspace initialization (if `workspace.id === ''`)
4. Empty workspace (if workspace initialized but no networks)
5. No selection (if workspace has networks but `networkId === ''`)
6. Network rendering (if network is loaded)

### Design Decisions

**Smooth Loading Experience**: The component prioritizes checking if a `networkId` is provided before checking workspace state. This prevents the "No network selected" message from flashing during initial load when a network is being loaded.

**Workspace Initialization Detection**: By checking `workspace.id === ''`, the component can distinguish between:

- Workspace still initializing (show loading)
- Workspace initialized but empty (show empty state)

This prevents confusing empty state messages from appearing before the workspace has finished loading.

### Empty Workspace Call to Action (#651)

`EmptyWorkspacePanel` (`data-testid="empty-workspace-panel"`) replaces the former "No network selected" dead end. It is **state-driven, not first-run-driven**: it shows whenever the workspace is empty — a returning visitor, someone who dismissed the welcome dialog with "Explore on my own", or anyone who just ran Data → Remove All Networks — which is what makes it complementary to the first-run `WelcomeDialog` (`src/features/Onboarding/`) rather than redundant with it.

It renders one line on what Cytoscape Web is, then actions wired to affordances that already exist behind the toolbar menus:

| Action                         | `data-testid`                  | Wired to                                                                                |
| ------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------- |
| Open Sample Networks (primary) | `empty-workspace-open-samples` | `useLoadDemoNetworks` (`src/data/hooks/`), shared with the Data-menu item               |
| Import from file               | `empty-workspace-import-file`  | `useFileUploadDialogStore.openDialog()` — the Data menu's "Network from File..." dialog |
| Load from NDEx                 | `empty-workspace-load-ndex`    | `useLoadFromNdexDialogStore.openDialog()` in browse mode                                |
| Take a tour                    | `empty-workspace-take-tour`    | `useOnboardingStore.startTour(DEFAULT_TOUR_ID)`, same as Help → Take a tour             |

**Pending and failure states.** Opening the samples is a live NDEx round trip (`fetchNdexSummaries`), so unlike the menu item the button has a busy state (all actions disabled, label "Opening sample networks…") and a failure state: an inline `Alert` (`empty-workspace-error`) with a Retry action (`empty-workspace-retry`). The other paths stay enabled when NDEx is down, so the panel needs no bundled offline fixture.

**Tours.** The actions are hidden while `activeTour != null` so the panel never competes with the joyride for the canvas and never offers "Take a tour" mid-tour; the heading and description stay.

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
- **OnboardingStore**: `EmptyWorkspacePanel` starts the default tour and hides its actions while one runs
- **Data-menu dialog stores**: `EmptyWorkspacePanel` opens the file-upload and NDEx dialogs through `fileUploadDialogStore` / `loadFromNdexDialogStore`
