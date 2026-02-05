# TableBrowser Feature

## Overview

The TableBrowser feature provides an interactive data grid interface for viewing and editing network data. It displays node, edge, and network attribute tables in a spreadsheet-like format using the Glide Data Grid library. Users can edit cell values, sort columns, create/delete columns, and interact with the network visualization through table selections.

## Architecture

The TableBrowser is a complex component that manages three separate data grids:
- **Node Table**: Displays node attributes and allows editing node properties
- **Edge Table**: Displays edge attributes and allows editing edge properties  
- **Network Table**: Displays network-level metadata and properties

## Component Structure

### Main Component
- **TableBrowser.tsx**: The main component that orchestrates the three tabbed data grids
  - Manages tab state (Nodes/Edges/Network)
  - Handles cell editing, column operations, and selection synchronization
  - Integrates with undo/redo system
  - Syncs selections between table and network visualization

### Supporting Components
- **TableColumnForm.tsx**: Forms for creating, editing, and deleting table columns
- **NetworkInfoPanel.tsx**: Displays network-level information in the Network tab
- **Icon.tsx**: Custom icons for table operations (sort, edit, duplicate, rename)
- **TableBrowserContextMenu.tsx**: Context menu for table operations

## Behavior

### Data Display
- Tables are displayed using Glide Data Grid, a high-performance data grid library
- Each table shows rows for nodes/edges and columns for attributes
- Cell values are formatted based on their data type (string, number, boolean, list, etc.)
- Column widths can be resized and persisted in UI state

### Cell Editing
- Cells are editable inline based on their data type
- Changes are tracked in the undo/redo system
- Validation ensures data type consistency
- List-type values support comma-separated input

### Selection Synchronization
- Row selections in the table are synchronized with network visualization
- Selecting rows in the table highlights corresponding nodes/edges in the network view
- Selecting nodes/edges in the network view updates table row selections
- Multi-select is supported with checkboxes

### Column Operations
- **Create Column**: Add new attribute columns to node or edge tables
- **Edit Column**: Modify column name and data type
- **Delete Column**: Remove columns from tables
- **Sort**: Sort table rows by column values (ascending/descending)
- **Resize**: Adjust column widths

### Integration Points

- **NetworkStore**: Reads network data (nodes, edges)
- **TableStore**: Reads and writes table data (node/edge attributes)
- **ViewModelStore**: Synchronizes selections between table and visualization
- **UiStateStore**: Manages tab state, column widths, and panel visibility
- **UndoStore**: Tracks edits for undo/redo functionality
- **VisualStyleStore**: Accesses visual style information for display

## Design Decisions

### Why Glide Data Grid?
- High performance for large datasets (thousands of rows)
- Built-in support for cell editing, selection, and virtualization
- Customizable cell renderers for different data types
- Efficient rendering with row/column virtualization

### Selection Model
- Uses a dual-selection model: table row selection and network element selection
- Selections are bidirectional - changes in either view update the other
- Selection state is stored in ViewModelStore for consistency

### Data Type Handling
- Values are stored as serialized strings in the table store
- Deserialization happens at display time based on column data type
- Validation ensures type safety when editing cells

### Undo/Redo Integration
- Each cell edit creates an undo command
- Batch operations (like column operations) create single undo entries
- Undo/redo operations restore both table data and network visualization state

## Future Improvements

- Add filtering/search capabilities to tables
- Support for exporting table data to CSV/Excel
- Column reordering with drag-and-drop
- Bulk edit operations for selected rows
- Custom cell renderers for specific data types (e.g., URLs, images)

