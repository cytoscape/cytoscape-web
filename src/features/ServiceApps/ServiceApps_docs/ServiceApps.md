# ServiceApps Feature

## Overview

The ServiceApps feature provides integration with external analysis services and algorithms. It allows users to submit network data or table data to remote services, monitor task progress, and handle results. The feature supports various input formats (CX2, graph models) and data scopes (all data, selected data, dynamic selection).

## Architecture

The ServiceApps feature is primarily a hook-based system that manages:
- Task submission to external services
- Task status polling
- Result retrieval and processing
- Result handling through action handlers

## Component Structure

### Main Hook
- **useRunTask**: Primary hook for running service tasks
  - Accepts service URL, algorithm name, parameters, and input data
  - Handles data preparation based on service input definitions
  - Submits tasks and processes results

### Supporting Hooks
- **useSubmitAndProcessTask**: Manages task lifecycle
  - Submits tasks to service endpoints
  - Polls task status until completion
  - Retrieves final results
  - Cleans up tasks after completion

### Data Preparation
- **createNetworkDataObj**: Prepares network data for submission
  - Supports CX2 format export
  - Handles data scoping (all, selected, dynamic)
  - Includes visual styles, summaries, and view models when needed

- **createTableDataObj**: Prepares table data for submission
  - Filters tables based on selection scope
  - Extracts specified columns
  - Formats data according to service requirements

- **filterTable**: Filters table records based on selected nodes/edges

### API Layer
- **api/index.ts**: HTTP client functions
  - `submitTask`: Submits task to service
  - `getTaskStatus`: Polls task status
  - `getTaskResult`: Retrieves task results
  - `deleteTask`: Cleans up completed tasks

### Result Handling
- **resultHandler/**: Action handlers for processing results
  - Different handlers for different result types
  - Can create new networks, update existing networks, or perform other actions

### Model Definitions
- **model/index.ts**: Type definitions
  - `ServiceAlgorithm`: Algorithm metadata and parameters
  - `ServiceInputDefinition`: Input requirements (network, columns, format)
  - `CytoContainerRequest/Result`: Request/response formats

## Behavior

### Task Submission
1. User selects an algorithm from available services
2. System prepares input data based on algorithm requirements
3. Data is formatted according to specified format (CX2, graph model, etc.)
4. Task is submitted to service endpoint
5. Task ID is stored for status tracking

### Status Polling
- System polls task status at regular intervals (500ms)
- Progress updates are displayed to user
- Polling continues until task reaches 100% completion
- Status includes progress percentage and message

### Result Processing
- Once complete, final result is retrieved
- Result is processed by appropriate action handler
- Handlers can:
  - Create new networks from results
  - Update existing networks
  - Display results in UI
  - Trigger other actions

### Data Scoping
- **All**: Entire network/table is sent
- **Selected**: Only selected nodes/edges are sent
- **Dynamic**: Uses current selection, falls back to all if nothing selected

### Input Formats
- **CX2**: Full Cytoscape CX2 format with all metadata
- **Graph Model**: Simplified graph structure
- **Table**: Column-based data extraction

## Integration Points

- **AppStore**: Manages current task state and progress
- **NetworkStore**: Accesses network data for submission
- **TableStore**: Accesses table data for submission
- **ViewModelStore**: Accesses selection state for data scoping
- **VisualStyleStore**: Includes visual styles in network exports
- **NetworkSummaryStore**: Includes network metadata

## Design Decisions

### Polling vs WebSockets
- Uses polling for simplicity and compatibility
- 500ms interval balances responsiveness with server load
- Could be upgraded to WebSockets for better performance

### Data Format Support
- CX2 format provides full network representation
- Graph model provides lightweight alternative
- Table format enables column-based analysis

### Action Handler System
- Extensible system for handling different result types
- Handlers are registered and invoked based on result type
- Allows custom result processing without modifying core code

### Task Cleanup
- Tasks are deleted after result retrieval
- Prevents accumulation of completed tasks on server
- Error handling ensures cleanup even on failures

## Future Improvements

- WebSocket support for real-time status updates
- Batch task submission
- Task history and result caching
- Support for streaming results
- Custom result visualization components
- Task scheduling and queuing

