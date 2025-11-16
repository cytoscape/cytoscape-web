# TableDataLoader Feature

## Overview

The TableDataLoader feature provides functionality to create networks from tabular data or join tabular data to existing networks. It supports CSV, TSV, and other delimited file formats. The feature guides users through file upload, column assignment, and data validation before creating or updating networks.

## Architecture

The TableDataLoader feature consists of two main workflows:
1. **Create Network From Table**: Converts tabular data into a network
2. **Join Table To Network**: Adds columns from tabular data to existing network tables

## Component Structure

### Create Network From Table

#### Main Components
- **CreateNetworkFromTableForm.tsx**: Main form container
  - Manages workflow steps (file upload, column assignment)
  - Handles full-screen mode
  - Coordinates between steps

- **TableColumnAssignmentForm.tsx**: Column assignment interface
  - Displays uploaded table data
  - Allows assigning column meanings (source node, target node, etc.)
  - Validates column assignments
  - Infers column types and meanings

- **NetworkNameInput.tsx**: Network naming component
- **ColumnMeaningForm.tsx**: Column meaning selection component
- **ImportNetworkFromTableMenuItem.tsx**: Menu entry point

#### Model
- **CreateNetworkFromTable.ts**: Core logic
  - `createNetworkFromTableData`: Converts table data to network
  - Column assignment validation
  - Data type inference
  - Network creation with nodes, edges, and tables

### Join Table To Network

#### Main Components
- **JoinTableToNetworkForm.tsx**: Main form container
- **TableColumnAppendForm.tsx**: Column append interface
  - Displays table to join
  - Allows selecting key column for matching
  - Allows selecting columns to append
  - Validates join configuration

- **TableUpload.tsx**: File upload component
- **ColumnAppendForm.tsx**: Column append configuration
- **JoinTableToNetworkMenuItem.tsx**: Menu entry point

#### Model
- **JoinTableToNetwork.ts**: Core logic
  - `joinRowsToTable`: Joins table data to network table
  - Key column matching
  - Row validation
  - Column appending logic

### Stores
- **createNetworkFromTableStore**: Manages create workflow state
- **joinTableToNetworkStore**: Manages join workflow state

## Behavior

### Create Network From Table Workflow

1. **File Upload**
   - User uploads CSV/TSV file
   - System detects delimiter (comma, tab, semicolon, space)
   - Validates file format and structure

2. **Column Assignment**
   - System displays table preview
   - User assigns column meanings:
     - **Source Node**: Source node identifier
     - **Target Node**: Target node identifier
     - **Interaction Type**: Edge type/label
     - **Source Node Attribute**: Attribute for source nodes
     - **Target Node Attribute**: Attribute for target nodes
     - **Edge Attribute**: Attribute for edges
     - **Not Imported**: Column to ignore
   - System infers types and meanings where possible
   - User can override inferences

3. **Validation**
   - Validates required columns (source/target nodes)
   - Validates data types
   - Checks for invalid values
   - Highlights validation errors

4. **Network Creation**
   - Creates network with nodes and edges
   - Creates node and edge tables with assigned attributes
   - Applies default visual style
   - Adds network to workspace

### Join Table To Network Workflow

1. **Table Selection**
   - User selects existing network
   - User uploads table to join

2. **Key Column Selection**
   - User selects key column from uploaded table
   - System matches key column to network table column
   - Validates key column type compatibility

3. **Column Selection**
   - User selects columns to append from uploaded table
   - System validates column names (no conflicts)
   - User can rename columns if needed

4. **Join Execution**
   - Matches rows by key column values
   - Appends selected columns to matching rows
   - Handles multiple matches (appends to all)
   - Updates network table

## Integration Points

- **NetworkStore**: Creates new networks or updates existing
- **TableStore**: Creates or updates node/edge tables
- **NetworkSummaryStore**: Creates network summaries
- **VisualStyleStore**: Applies default visual styles
- **ViewModelStore**: Creates initial network views
- **WorkspaceStore**: Adds networks to workspace
- **FileUpload**: Uses file upload infrastructure

## Design Decisions

### Two-Step Workflow
- File upload and column assignment separated for clarity
- Allows user to review data before assignment
- Reduces cognitive load

### Column Meaning Assignment
- Flexible assignment system supports various table formats
- Inference reduces manual work
- Validation prevents errors

### Type Inference
- Automatically detects data types
- User can override if needed
- Validates type compatibility

### Key Column Matching
- Simple key-based matching for joins
- Supports string, integer, long types
- Handles multiple matches gracefully

### Validation System
- Real-time validation feedback
- Highlights invalid values
- Prevents submission with errors

## Future Improvements

- Support for Excel files
- Automatic column meaning detection
- Template-based column assignment
- Batch file processing
- Preview of network before creation
- Undo/redo for column assignments
- Support for more file formats
- Advanced join strategies (left, right, outer)

