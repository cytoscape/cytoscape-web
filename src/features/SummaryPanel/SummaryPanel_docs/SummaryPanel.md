# SummaryPanel Feature

## Overview

The SummaryPanel feature displays and manages network summaries (metadata) in the workspace. It shows a list of all networks with their properties (name, version, description) and provides functionality to edit network properties, delete networks, and navigate to networks.

## Architecture

The SummaryPanel is composed of several components that work together to display and manage network summaries:

## Component Structure

### Main Components

- **Summaries.tsx**: Container component that lists all network summaries
  - Retrieves summaries from NetworkSummaryStore
  - Maps summaries to NetworkPropertyPanel components
  - Shows loading state during workspace initialization ("Loading workspace...")
  - Shows empty state message when workspace is initialized but no networks exist ("No networks in workspace")
  - Prevents flickering of empty state messages during initial load by checking workspace initialization status

- **NetworkPropertyPanel.tsx**: Individual network summary card
  - Displays network name, version, and description
  - Shows a single vertical "..." overflow button whose menu holds the save-to-NDEx, edit and delete actions
  - Badges that button with a warning dot while the network has unsaved changes
  - Handles click to navigate to network
  - Highlights active network
  - Integrates with NetworkPropertyEditor for editing

- **NetworkPropertyEditor.tsx**: Popover editor for network properties
  - Edits network name, version, and description
  - Uses Tiptap rich text editor for description
  - Supports undo/redo for property changes
  - Validates and saves changes to NetworkSummaryStore

- **NdexNetworkPropertyTable.tsx**: Table editor for network-level properties
  - Displays network properties in a table format
  - Allows adding, editing, and deleting properties
  - Validates property values based on data type
  - Used within NetworkPropertyEditor

## Behavior

### Network Display

- Networks are displayed as cards in a vertical list
- Each card shows:
  - Network name (editable)
  - Version (editable)
  - Description preview (editable, full description in editor)
  - Overflow ("...") button next to the network name, carrying a warning dot
    badge while the network has unsaved changes, and opening a menu with:
    - Save status / save to NDEx (disabled when there are no unsaved changes, or
      when the row is not the currently open network — only that network's data
      is loaded, so only it can be saved)
    - Edit network properties (opens property editor)
    - Remove the network from workspace

### Network Navigation

- Clicking on a network card navigates to that network
- Active network is highlighted with different background color
- Navigation updates URL and workspace state

### Property Editing

- Choosing "Edit network properties" in the overflow menu opens a popover editor
  anchored to the overflow button
- Editor allows editing:
  - Name: Simple text input
  - Version: Simple text input
  - Description: Rich text editor (Tiptap)
- Changes are saved to NetworkSummaryStore
- Changes are tracked in undo/redo system
- Network modified flag is set when properties change

### Network Deletion

- The overflow menu's "Remove the network from workspace" item removes the network
- Confirmation dialog may be shown (handled by parent)
- Deletion updates workspace state

### Network Properties Table

- Network-level properties can be edited in a table
- Properties have:
  - Data type (string, number, boolean, list, etc.)
  - Property name (predicate)
  - Property value
- Values are validated based on data type
- Invalid values are highlighted but don't prevent editing

## Integration Points

- **NetworkSummaryStore**: Reads and writes network summaries
- **WorkspaceStore**: Manages workspace state and network list
- **UiStateStore**: Tracks active network and UI state
- **UndoStore**: Tracks property changes for undo/redo
- **URL Navigation**: Updates URL when navigating to networks

## Design Decisions

### Card-Based Layout

- Cards provide clear visual separation between networks
- Hover effects indicate interactivity
- Active network highlighting provides clear feedback

### Popover Editor

- Popover keeps editor close to the network card
- Non-modal design allows viewing network while editing
- Click-outside-to-close provides intuitive interaction

### Rich Text Description

- Tiptap editor provides formatting capabilities
- HTML content is stored and rendered
- Plain text fallback for simple descriptions

### Property Validation

- Validation happens in real-time as user types
- Invalid values are visually indicated
- Validation prevents saving invalid data to store

## Future Improvements

- Drag-and-drop reordering of networks
- Bulk operations (delete multiple, edit multiple)
- Network search and filtering
- Network grouping/categorization
- Import/export network summaries
- Network comparison view
