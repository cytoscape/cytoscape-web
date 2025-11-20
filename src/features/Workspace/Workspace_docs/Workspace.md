# Workspace Feature

## Overview

The Workspace feature provides the main application workspace that orchestrates all panels, network visualization, and UI components. It manages the layout using Allotment (resizable panels), coordinates network loading, and integrates all major features into a cohesive interface.

## Architecture

The Workspace is the central orchestrator that:
- Manages panel layout (left, right, bottom)
- Coordinates network loading and switching
- Integrates NetworkPanel, TableBrowser, Vizmapper, and other features
- Handles lazy loading of heavy components
- Manages workspace state and persistence

## Component Structure

### Main Component
- **WorkspaceEditor.tsx**: Main workspace component
  - Allotment-based resizable layout
  - Left panel: NetworkBrowserPanel, LayoutTools
  - Center: NetworkPanel (network visualization)
  - Right panel: SidePanel (Vizmapper, etc.)
  - Bottom panel: TableBrowser
  - Manages panel states (open/closed)

### Sub-Panels
- **NetworkBrowserPanel**: Network list and navigation
- **SidePanel**: Right-side panel with tabs
- **LayoutTools**: Layout algorithm controls
- **NetworkPanel**: Network visualization (lazy loaded)
- **TableBrowser**: Data table interface (lazy loaded)

## Behavior

### Panel Management
- **Left Panel**: Network list and layout tools
  - Can be opened/closed
  - Resizable width
  - Contains NetworkBrowserPanel and LayoutTools

- **Right Panel**: Visual style editor and other tools
  - Tabbed interface
  - Can be opened/closed
  - Contains Vizmapper and other side panels

- **Bottom Panel**: Table browser
  - Can be opened/closed
  - Resizable height
  - Contains TableBrowser

### Network Loading
- Loads network data on demand
- Handles network switching
- Manages loading states
- Error handling for failed loads

### Layout Coordination
- Allotment manages panel resizing
- Panel states persisted in UI state
- Responsive to window resizing
- Maintains aspect ratios

### Lazy Loading
- Heavy components (TableBrowser, NetworkPanel) lazy loaded
- Improves initial load time
- Loads on demand when panels open

## Integration Points

- **All Features**: Workspace integrates all major features
- **WorkspaceStore**: Manages workspace state
- **NetworkStore**: Accesses network data
- **UiStateStore**: Manages panel states and UI configuration
- **ViewModelStore**: Accesses network views
- **TableStore**: Accesses table data
- **VisualStyleStore**: Accesses visual styles
- **Allotment**: Panel resizing library

## Design Decisions

### Allotment-Based Layout
- Flexible resizable panels
- User-controlled layout
- Maintains proportions
- Smooth resizing experience

### Panel State Management
- Open/closed states for each panel
- Persisted in UI state
- Restored on app load
- Keyboard shortcuts for toggling

### Lazy Loading Strategy
- Improves performance
- Loads components when needed
- Reduces initial bundle size
- Better user experience

### Centralized Orchestration
- Single component coordinates all features
- Clear data flow
- Easier to manage state
- Consistent behavior

## Future Improvements

- Customizable panel layouts
- Multiple workspace views
- Workspace templates
- Panel docking/undocking
- Split view for multiple networks
- Workspace export/import

