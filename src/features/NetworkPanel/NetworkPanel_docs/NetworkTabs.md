# NetworkTabs Component

## Overview

`NetworkTabs` manages multiple renderer views (tabs) for a single network. It provides tab navigation between different renderers (e.g., "Tree View", "Circle View") and handles activation of the network view when tabs are clicked.

## Behavior

### Tab Navigation

- Displays tabs for each available renderer registered in the `RendererStore`
- Allows switching between different renderer views for the same network
- Uses MUI `Tabs` component for the tab interface
- Tab selection is managed via `activeTabIndex` in `UiStateStore`

### Network Activation

When a tab is clicked, the component activates the network view:

- **`onChange` handler**: Called when switching to a different tab. Calls `handleClick()` which sets `activeNetworkView` to the network's ID.
- **`onClick` handler on each Tab**: Handles the case where a tab is already selected (since `onChange` doesn't fire in that case). Also calls `handleClick()` to ensure the network view is activated.

**Why both handlers?**
- MUI `Tabs` `onChange` only fires when the selected tab actually changes
- If a user clicks an already-selected tab, `onChange` won't fire
- The `onClick` handler on individual `Tab` components ensures activation happens even when clicking an already-selected tab

### Visual Feedback

- The active state (orange border) is managed by the parent `NetworkPanel` component
- `isActive` prop is passed down from `NetworkPanel` and used to style the active tab content
- The `useEffect` in `NetworkPanel` ensures only one panel is active at a time based on `activeNetworkView`

## Component Structure

```
NetworkTabs
├── Tabs (MUI component)
│   └── Tab[] (one per renderer)
│       └── onClick handler (activates network view)
└── Box (content area)
    └── NetworkTab[] (one per renderer, only selected one is visible)
        └── isActive prop (controls orange border)
```

## Integration Points

- **UiStateStore**: 
  - Reads `activeTabIndex` to determine which tab is selected
  - Reads `customNetworkTabName` for custom tab labels
  - `handleClick` updates `activeNetworkView` to activate the network
- **NetworkPanel**: 
  - Receives `isActive` prop indicating if this network panel is active
  - Receives `handleClick` callback to activate the network view
  - Receives `setIsActive` callback (currently unused, kept for potential future use)

## Design Decisions

**No Optimistic State Updates**: The component does not optimistically set `isActive` state. Instead, it relies on `handleClick()` to update `activeNetworkView`, and the `useEffect` in `NetworkPanel` handles setting `isActive` based on the store state. This prevents race conditions where multiple panels could be active simultaneously.

**Tab Click Activation**: Both `onChange` and individual Tab `onClick` handlers call `handleClick()` to ensure network activation happens regardless of whether the tab selection changes or not.

## Related Components

- **NetworkPanel**: Parent component that manages `isActive` state and provides `handleClick` callback
- **NetworkTab**: Child component that renders individual renderer views with proper click handling
- **TabPanel**: Used in SidePanel for similar tab functionality

