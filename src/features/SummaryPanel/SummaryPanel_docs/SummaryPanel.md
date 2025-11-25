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
  - Shows edit and delete buttons
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
  - Edit button (opens property editor)
  - Delete button (removes network from workspace)

### Network Navigation

- Clicking on a network card navigates to that network
- Active network is highlighted with different background color
- Navigation updates URL and workspace state

### Property Editing

- Clicking edit button opens a popover editor
- Editor allows editing:
  - Name: Simple text input
  - Version: Simple text input
  - Description: Rich text editor (Tiptap)
- Changes are saved to NetworkSummaryStore
- Changes are tracked in undo/redo system
- Network modified flag is set when properties change

### Network Deletion

- Delete button removes network from workspace
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
