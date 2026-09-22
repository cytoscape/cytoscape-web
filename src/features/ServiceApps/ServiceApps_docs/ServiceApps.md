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

### Menu Placement (`cyWebMenuItem`)

A service's metadata places its menu item via `cyWebMenuItem`:

- **`root`** — the top-level menu the item is added under. Valid roots are:
  `Data`, `Edit`, `Layout`, `Analysis`, `Tools`, `Apps`, `Help`. Matching is
  case-insensitive. A missing or unrecognized `root` falls back to the `Apps`
  menu, and the user is shown a warning listing the valid roots when the app is
  added (see `invalidRootMessage`).
- **`path`** — the nested sub-menu path under the root, each entry with a
  `name` and a `gravity` (lower gravity sorts earlier).

Routing is implemented by pure helpers in
`src/models/AppModel/impl/menuRouting.ts` (`resolveRootMenu`,
`filterServiceAppsByRoot`). Each top-level menu component hosts the service
apps routed to it via the shared `useServiceAppMenu(root)` hook. To support a
new root, add it to `RootMenu` and `SUPPORTED_ROOT_MENUS`, and wire the
corresponding menu component to call `useServiceAppMenu`.

### Parameters

A service's `parameters` array follows the shared parameter spec
(`docs/specifications/APP_PARAMETERS_SPECIFICATION.md`, model
`src/models/AppModel/AppParameter.ts`; `ServiceAppParameter` is that spec
with every value a string). The input dialog (`AppMenuItemDialog` in
`features/ToolBar/AppMenu/MenuFactory.tsx`) renders them through the shared
`ParameterForm` (`src/features/ParameterForm/`): fields in array order,
`groups` as nested fieldsets, `validationType` / `minValue` / `maxValue` /
`validationRegex` / `valueList` enforced with `validationHelp` as the message,
and Submit disabled while a value is invalid. Edits go to
`AppStore.updateServiceParameter(url, key, value)` as strings; `key` is the
parameter's `displayName`, or its group path joined with `/` when two
parameters share a label (`parameterKeys`), and `buildCustomParameters`
sends the payload under the same keys. Definitions the form cannot render as
declared are logged by `parseServiceMetadata`, never rejected.

#### Validation (what changed with the shared form)

The metadata a service returns is parsed as leniently as before: the
service's top-level `name` and each parameter's `displayName` are the only
required fields, unknown fields pass through, `null` is accepted everywhere,
and a malformed `groups` value is logged and treated as "no groups". The
one exception is a parameter whose `displayName` is `__proto__`: no plain
record keyed by parameter name can hold it (the value vanishes into the
prototype setter), so that parameter is logged and dropped while the rest of
the service loads. The request payload is unchanged too: `parameters` is a string-to-string map,
checkbox values travel as `"true"` / `"false"`, and an untouched default is
sent verbatim.

What the input dialog enforces did change. The rules the spec always
declared are now applied (`validateParameterValue` in
`src/models/AppModel/impl/parameters.ts`); before, only `validationRegex`
was checked:

- `text` with `validationType` `number` must parse as a number, `digits` as a
  whole number; `minValue` / `maxValue` bound both. The message is
  `validationHelp`, or a built-in default.
- `text` with `validationType` `string` (or none) must match
  `validationRegex` when one is given. A pattern the host refuses to run
  (over 1000 characters, or unsafe under catastrophic backtracking) fails
  validation; a pattern with a syntax error is ignored.
- `dropDown` / `radio` values must be one of `valueList` when the list is
  non-empty.
- `nodeColumn` / `edgeColumn` values must name a column of the current
  network. A stored value that does not (a default the network lacks, or a
  choice made on another network) is shown marked "(not in this network)"
  and reported.

Consequences a service author will notice:

- Submit is disabled while any stored value fails a rule, with the reason as
  the button's tooltip. A default that breaks its own rule — an empty default
  on a `number` field, a `dropDown` default missing from `valueList`, a
  column default the network lacks — keeps Submit disabled until the user
  picks a valid value. Such values used to be submitted as-is.
- A `text` field stores only values that validate, so a half-typed number is
  never sent.
- `edgeColumn` pickers list the edge table's columns (they used to list the
  node table's). Column names are sorted case-insensitively, and "(none)" is
  offered so a column choice can be cleared to the empty string.
- `dropDown` and `radio` controls display `defaultValue` when untouched,
  which is what was already being sent.
- `accessToken` and `ndexUUID` are unaffected.

### Auto-filled Parameters

Some parameter `type` values are resolved automatically by the webapp at run
time instead of being shown as inputs in the dialog. They are hidden from the
user and their value is injected into the task's `parameters` map on submit:

- **`ndexUUID`** — the full NDEx URL of the current network
  (`<ndexBaseUrl>/v3/networks/<uuid>`). Empty string when the current network
  is not an NDEx network (CW-620).
- **`accessToken`** — the user's NDEx access/credential token. Empty string
  when the user is not signed in (CW-619).

Resolution is implemented by pure helpers in
`src/models/AppModel/impl/index.ts` (`buildCustomParameters`,
`resolveParameterValue`, `isAutoFilledParameter`). To add a new auto-filled
type, add it to `ParameterUiType`, mark it in `isAutoFilledParameter`, and
resolve it in `resolveParameterValue`.

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
