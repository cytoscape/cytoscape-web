# Cytoscape Web - Comprehensive Test Plan

## Application Overview

Cytoscape Web is a web-based network visualization and analysis application that runs in modern browsers. The application provides a workspace-based interface for loading, viewing, editing, and analyzing biological and other network data. Key features include:

- **Workspace Management**: Create and manage multiple workspaces with multiple networks
- **Network Loading**: Import networks from NDEx, local files (CX2, CSV, TSV, TXT), or sample networks
- **Network Visualization**: Interactive node-link diagrams with customizable visual styles
- **Table Management**: View and edit node, edge, and network attributes in tabular format
- **Layout Algorithms**: Apply various graph layout algorithms to organize network structure
- **Search & Filter**: Search and filter nodes/edges within networks
- **Style Editor**: Customize visual appearance of nodes and edges
- **Export & Download**: Export networks to various formats and download as files
- **Panel Management**: Resizable and collapsible panels for workspace, network view, and tables
- **Authentication**: Keycloak-based authentication for NDEx operations

The application uses a URL structure of `/:workspaceId/networks/:networkId?params` and maintains state in IndexedDB for persistence.

## Test Environment

- **Base URL**: `http://localhost:5500`
- **Starting State**: Fresh browser session with cleared IndexedDB (unless otherwise specified)
- **Authentication**: Anonymous usage allowed for basic UI; NDEx operations requiring auth are optional
- **Test Data**: Available in `test/fixtures/` directory

## Test Scenarios

### 1. Application Initialization and UI Structure

#### 1.1 Initial Page Load
**Seed:** `tests/seed.spec.ts`

**Steps:**
1. Navigate to `http://localhost:5500/`
2. Wait for DOM content to load
3. Accept cookie consent banner if present

**Expected Results:**
- Application loads without fatal errors
- Page title displays "Cytoscape Web"
- Main application shell is visible
- URL redirects to `/:workspaceId/networks/` format
- No console errors (except expected warnings about disabled buttons)

#### 1.2 Main UI Components Visibility
**Steps:**
1. After initial load, verify all main UI components are present

**Expected Results:**
- **Top Toolbar**: Contains menu buttons (Data, Edit, Layout, Analysis, Tools, Apps, Help, License)
- **Search Bar**: Visible with placeholder "Search current network"
- **Login Button**: "Click to login" button visible in top right
- **Left Panel**: Workspace panel with WORKSPACE and STYLE tabs visible
- **Center Panel**: Network view area (initially shows "Loading network data..." during initialization, then "No network selected" if no network is loaded)
- **Bottom Panel**: Table browser with Nodes, Edges, and Network tabs
- **Workspace Info**: Displays "Untitled Workspace" and creation timestamp

#### 1.3 Cookie Consent Banner
**Steps:**
1. Navigate to application
2. Observe cookie consent banner
3. Click "Accept cookies" button
4. Refresh page

**Expected Results:**
- Cookie consent banner appears on first visit
- Banner contains "Learn more" link to privacy policy
- Clicking "Accept" dismisses banner
- Banner does not reappear after acceptance (cookie persisted)
- Clicking "Decline" also dismisses banner

**Negative Test:**
- Click "Decline cookies" and verify banner behavior

### 2. Data Menu Operations

#### 2.1 Data Menu Opens and Displays Options
**Steps:**
1. Click the "Data" menu button in toolbar
2. Observe menu contents

**Expected Results:**
- Menu opens and displays all options:
  - "Open Network(s) from NDEx..."
  - "Open Workspace from NDEx..." (disabled if not logged in)
  - "Open Sample Networks"
  - "Open in Cytoscape" (disabled if no network)
  - "Import" (submenu)
  - Separator
  - "Save to NDEx" (disabled if not logged in or no network)
  - "Copy to NDEx" (disabled if not logged in or no network)
  - "Download Network File (.cx2)" (disabled if no network)
  - "Save Workspace to NDEx (overwrite)" (disabled if not logged in)
  - "Save Workspace to NDEx" (disabled if not logged in)
  - "Export" (submenu)
  - Separator
  - "Remove Current Network" (disabled if no network)
  - "Remove All Networks" (disabled if no networks)
  - Separator
  - "Reset Local Workspace" → "Clear Local Database"

#### 2.2 Open Sample Networks
**Steps:**
1. Click "Data" menu
2. Click "Open Sample Networks"
3. Wait for network to load

**Expected Results:**
- Sample network dialog or selection appears
- Network loads successfully
- Network appears in workspace panel
- Network view displays nodes and edges
- Table browser shows node/edge data
- URL updates to include network ID

**Negative Test:**
- If network fails to load, verify error message is displayed clearly

#### 2.3 Open Network from NDEx (Search by UUID)
**Steps:**
1. Click "Data" menu
2. Click "Open Network(s) from NDEx..."
3. Verify dialog appears with `data-testid="load-from-ndex-dialog"`
4. Select "Search" tab if tabs are present
5. Enter a valid NDEx UUID in search input (`data-testid="load-from-ndex-search-input"`)
6. Click search button (`data-testid="load-from-ndex-search-button"`)
7. Wait for results
8. Verify network checkbox appears (`data-testid="load-from-ndex-network-checkbox-<UUID>"`)
9. Select network and click "Open Network(s)"

**Expected Results:**
- Dialog opens successfully
- Search input accepts UUID
- Search executes and returns results
- Network appears in results list with checkbox
- Network loads after selection
- Network appears in workspace and renders in view

**Test Data:**
- Public NDEx UUID: `a9763574-c72f-11ed-a79c-005056ae23aa`

**Negative Tests:**
- Enter invalid UUID format → verify error handling
- Enter non-existent UUID → verify appropriate message
- Cancel dialog → verify no network loaded

#### 2.4 Import Network from File (CX2)
**Steps:**
1. Click "Data" menu
2. Click "Import" → "Import"
3. Select a valid CX2 file from `test/fixtures/cx2/valid/`
4. Complete import process

**Expected Results:**
- File picker opens
- CX2 file is accepted
- Network imports successfully
- Nodes and edges appear in view
- Table data populates correctly
- Network appears in workspace panel

**Test Files:**
- Use files from `test/fixtures/cx2/valid/`

**Negative Tests:**
- Attempt to import invalid CX2 file → verify error message
- Attempt to import unsupported format → verify rejection
- Cancel import → verify no network loaded

#### 2.5 Import Network from Delimited Text File
**Steps:**
1. Click "Data" menu → "Import" → "Import"
2. Select a CSV/TSV/TXT file with edge list format
3. Map columns (source, target, interaction)
4. Preview and confirm import

**Expected Results:**
- File picker accepts CSV/TSV/TXT files
- Column mapping interface appears
- Preview shows expected data
- Network imports with correct nodes and edges
- Attributes are preserved

**Test Files:**
- `test/fixtures/tables/edge-list.valid.csv`
- `test/fixtures/tables/csv-with-headers.valid.csv`

**Edge Cases:**
- File with no headers → verify default column mapping
- File with European decimal format → verify parsing
- File with quoted values → verify handling
- Empty file → verify error

#### 2.6 Import Table from File
**Steps:**
1. Load a network first
2. Navigate to Table Browser (bottom panel)
3. Select appropriate tab (Nodes, Edges, or Network)
4. Click "Import Table from File ..." button
5. Select CSV file
6. Map key columns (Network Key column and Data Key column)
7. Complete import

**Expected Results:**
- Import button is enabled when network is loaded
- File picker opens
- Column mapping interface appears
- Table data imports successfully
- Row counts update correctly
- Data types are preserved (String, Boolean, Integer, Double, List)
- Mismatches are reported if keys don't match

**Test Files:**
- `test/fixtures/tables/node-attributes.valid.csv`
- `test/fixtures/tables/edge-attributes.valid.csv`

**Negative Tests:**
- Import with mismatched keys → verify error/warning
- Import invalid file format → verify rejection

#### 2.7 Download Network File (.cx2)
**Steps:**
1. Load a network
2. Click "Data" menu
3. Click "Download Network File (.cx2)"
4. Verify file download

**Expected Results:**
- Download button is enabled when network is loaded
- File downloads with .cx2 extension
- File can be re-imported successfully
- Re-imported network matches original

**Negative Test:**
- Attempt download with no network → verify button disabled

#### 2.8 Clear Local Database
**Steps:**
1. Load one or more networks
2. Click "Data" menu
3. Click "Reset Local Workspace" → "Clear Local Database"
4. Confirm action if prompted
5. Refresh page

**Expected Results:**
- Confirmation dialog appears (if implemented)
- Database is cleared
- All networks removed
- Workspace resets to empty state
- Fresh workspace ID is generated on refresh

**Warning:** This is a destructive operation - verify confirmation mechanism

### 3. Edit Menu Operations

#### 3.1 Edit Menu Opens and Shows Options
**Steps:**
1. Click "Edit" menu button
2. Observe menu contents

**Expected Results:**
- Menu opens displaying:
  - "Delete Selected Nodes" (disabled if no selection)
  - "Delete Selected Edges" (disabled if no selection)
  - "Undo" (disabled if no undo history)
  - "Redo" (disabled if no redo history)

#### 3.2 Delete Selected Nodes
**Precondition:** Network loaded with nodes selected

**Steps:**
1. Load a network
2. Select one or more nodes in network view
3. Click "Edit" menu
4. Click "Delete Selected Nodes"
5. Confirm deletion if prompted

**Expected Results:**
- Delete option is enabled when nodes are selected
- Selected nodes are removed from network
- Edges connected to deleted nodes are also removed
- Table browser updates to reflect changes
- Node count decreases appropriately

**Negative Test:**
- Attempt deletion with no selection → verify option disabled

#### 3.3 Delete Selected Edges
**Precondition:** Network loaded with edges selected

**Steps:**
1. Load a network
2. Select one or more edges in network view
3. Click "Edit" menu
4. Click "Delete Selected Edges"
5. Confirm deletion if prompted

**Expected Results:**
- Delete option is enabled when edges are selected
- Selected edges are removed from network
- Nodes remain (unless orphaned)
- Table browser updates
- Edge count decreases

#### 3.4 Undo Operation
**Precondition:** Network loaded and edit operation performed

**Steps:**
1. Perform an edit operation (e.g., delete node)
2. Click "Edit" menu
3. Click "Undo"

**Expected Results:**
- Undo option is enabled after edit
- Previous state is restored
- Network view updates
- Table browser reflects restored state

#### 3.5 Redo Operation
**Precondition:** Undo operation performed

**Steps:**
1. Perform edit operation
2. Undo the operation
3. Click "Edit" menu
4. Click "Redo"

**Expected Results:**
- Redo option is enabled after undo
- Previously undone operation is reapplied
- Network state matches pre-undo state

### 4. Layout Menu Operations

#### 4.1 Layout Menu Opens
**Steps:**
1. Click "Layout" menu button
2. Observe menu contents

**Expected Results:**
- Menu opens with layout algorithm options
- Common layouts available (e.g., Force-directed, Grid, Circular, Hierarchical)

#### 4.2 Apply Layout Algorithm
**Precondition:** Network loaded

**Steps:**
1. Load a network
2. Note initial node positions
3. Click "Layout" menu
4. Select a layout algorithm (e.g., "Grid Layout")
5. Apply layout

**Expected Results:**
- Layout menu shows available algorithms
- Selected layout applies successfully
- Node positions update
- Network view updates smoothly
- Layout completes without errors

**Edge Cases:**
- Apply layout to empty network → verify graceful handling
- Apply multiple layouts sequentially → verify each applies correctly

#### 4.3 Layout Tools Button
**Steps:**
1. Observe "Layout Tools" button in left panel
2. Click "Layout Tools" button

**Expected Results:**
- Button is visible in workspace panel
- Clicking opens layout tools interface or panel
- Layout options are accessible

### 5. Panel Management

#### 5.1 Left Panel (Workspace Panel) Toggle
**Steps:**
1. Observe left panel state
2. Look for panel toggle button/affordance
3. Click to collapse panel
4. Click again to expand panel

**Expected Results:**
- Panel toggle button is visible when panel is open
- Panel collapses smoothly
- Panel expands smoothly
- Content is preserved when toggling
- Tooltip or label indicates panel state

#### 5.2 Left Panel Tabs (WORKSPACE and STYLE)
**Steps:**
1. Click "WORKSPACE" tab in left panel
2. Observe workspace content
3. Click "STYLE" tab
4. Observe style editor content

**Expected Results:**
- Both tabs are visible and clickable
- WORKSPACE tab shows workspace information and network list
- STYLE tab shows style editor interface
- Tab switching is smooth
- Selected tab is visually indicated

#### 5.3 Bottom Panel (Table Browser) Tabs
**Steps:**
1. Click "Nodes" tab in bottom panel
2. Observe node table
3. Click "Edges" tab
4. Observe edge table
5. Click "Network" tab
6. Observe network attributes table

**Expected Results:**
- All three tabs are visible
- Nodes tab shows node attribute table
- Edges tab shows edge attribute table
- Network tab shows network-level attributes
- Tab switching updates table content
- Selected tab is visually indicated

#### 5.4 Panel Resizing
**Steps:**
1. Locate panel resize handles
2. Drag to resize left panel
3. Drag to resize bottom panel
4. Refresh page

**Expected Results:**
- Resize handles are visible and functional
- Panels resize smoothly
- Content adjusts appropriately
- Panel sizes persist after refresh (if implemented)

### 6. Search Functionality

#### 6.1 Search Bar Visibility and Initial State
**Steps:**
1. Observe search bar in top toolbar
2. Verify placeholder text

**Expected Results:**
- Search bar is visible with placeholder "Search current network"
- Search bar is accessible via keyboard
- Search icon/button is present

#### 6.2 Search Nodes
**Precondition:** Network loaded

**Steps:**
1. Load a network
2. Click in search bar
3. Type a node name or attribute value
4. Press Enter or click search button
5. Observe results

**Expected Results:**
- Search executes
- Matching nodes are highlighted or selected
- Search results are displayed
- Network view updates to show matches

**Edge Cases:**
- Search with no matches → verify appropriate message
- Search with special characters → verify handling
- Clear search → verify network returns to normal state

#### 6.3 Search Settings
**Steps:**
1. Open search settings (if available)
2. Verify default settings:
   - OR logic (vs AND)
   - Search scope: Nodes
   - Exact match: ON
3. Modify settings
4. Perform search

**Expected Results:**
- Settings are accessible
- Default values are as expected
- Settings can be modified
- Search behavior reflects settings

### 7. Style Editor

#### 7.1 Access Style Editor
**Steps:**
1. Load a network
2. Click "STYLE" tab in left panel
3. Observe style editor interface

**Expected Results:**
- STYLE tab is accessible
- Style editor interface is visible
- Style options are displayed

#### 7.2 Modify Node Style (Color)
**Steps:**
1. Load a network
2. Open STYLE tab
3. Locate node color/style options
4. Change node color
5. Apply changes

**Expected Results:**
- Style options are editable
- Color picker or selector is functional
- Changes apply to network view
- Visual changes are immediately visible
- Changes persist

#### 7.3 Modify Node Style (Size)
**Steps:**
1. Load a network
2. Open STYLE tab
3. Locate node size options
4. Change node size
5. Apply changes

**Expected Results:**
- Size options are editable
- Size changes apply to all nodes (or selected nodes)
- Network view updates
- Changes are visually apparent

#### 7.4 Modify Edge Style
**Steps:**
1. Load a network
2. Open STYLE tab
3. Locate edge style options
4. Modify edge color, width, or style
5. Apply changes

**Expected Results:**
- Edge style options are available
- Changes apply to edges
- Visual updates are immediate

### 8. Table Browser Operations

#### 8.1 Table Browser Initial State
**Steps:**
1. Load application without network
2. Observe table browser panel

**Expected Results:**
- Table browser is visible
- "Insert New Column" button is disabled
- "Import Table from File ..." button is disabled
- Search/filter input is present
- Empty state message may be displayed

#### 8.2 Table Browser with Network Loaded
**Precondition:** Network loaded

**Steps:**
1. Load a network
2. Observe table browser
3. Switch between Nodes, Edges, and Network tabs

**Expected Results:**
- Table displays data for loaded network
- "Insert New Column" button is enabled
- "Import Table from File ..." button is enabled
- Data is sortable and filterable
- Column headers are visible

#### 8.3 Insert New Column
**Steps:**
1. Load a network
2. Select Nodes tab in table browser
3. Click "Insert New Column" button
4. Enter column name and type
5. Confirm creation

**Expected Results:**
- New column dialog/form appears
- Column name can be entered
- Data type can be selected
- Column is added to table
- Column appears in network data

#### 8.4 Table Search/Filter
**Steps:**
1. Load a network with data
2. Navigate to table browser
3. Type in search/filter input
4. Observe filtered results

**Expected Results:**
- Search input is functional
- Results filter as you type
- Matching rows are highlighted or shown
- Clear button resets filter

#### 8.5 Edit Table Cell
**Steps:**
1. Load a network
2. Navigate to table browser
3. Click on a cell
4. Edit cell value
5. Press Enter or click away

**Expected Results:**
- Cell becomes editable
- Value can be modified
- Changes are saved
- Network data updates accordingly

### 9. Network View Interactions

#### 9.1 Network Canvas Renders
**Precondition:** Network loaded

**Steps:**
1. Load a network
2. Observe center panel

**Expected Results:**
- Network canvas is visible
- Nodes and edges are rendered
- Network is interactive
- Viewport controls are available (zoom, pan)

#### 9.2 Select Node
**Steps:**
1. Load a network
2. Click on a node in network view
3. Observe selection state

**Expected Results:**
- Node becomes selected (visual indication)
- Selection is reflected in table browser
- Edit menu options update
- Node details may be displayed

#### 9.3 Select Multiple Nodes
**Steps:**
1. Load a network
2. Hold Ctrl/Cmd and click multiple nodes
3. Or drag to create selection box

**Expected Results:**
- Multiple nodes can be selected
- All selected nodes are highlighted
- Selection is reflected in table browser
- Bulk operations become available

#### 9.4 Drag Node
**Steps:**
1. Load a network
2. Click and drag a node
3. Release mouse

**Expected Results:**
- Node can be dragged
- Node position updates
- Network layout adjusts
- Position is saved

#### 9.5 Zoom and Pan
**Steps:**
1. Load a network
2. Use mouse wheel to zoom
3. Click and drag to pan
4. Use zoom controls if available

**Expected Results:**
- Zoom in/out works smoothly
- Panning moves viewport
- Zoom controls are functional
- Viewport state is maintained

### 10. URL and Routing

#### 10.1 Initial URL Redirect
**Steps:**
1. Navigate to `http://localhost:5500/`
2. Observe URL after load

**Expected Results:**
- URL redirects to `/:workspaceId/networks/` format
- Workspace ID is generated
- No network ID in URL initially

#### 10.2 URL Updates with Network Load
**Steps:**
1. Load a network
2. Observe URL change

**Expected Results:**
- URL updates to include network ID
- Format: `/:workspaceId/networks/:networkId`
- URL is shareable and reloadable

#### 10.3 Direct Navigation to Network
**Steps:**
1. Note a network ID from a loaded network
2. Navigate directly to `/:workspaceId/networks/:networkId`
3. Refresh page

**Expected Results:**
- Network loads from URL
- Network ID in URL matches loaded network
- Workspace is preserved

### 11. Error Handling

#### 11.1 Invalid Network Load
**Steps:**
1. Attempt to load invalid network file
2. Or attempt to load non-existent NDEx network

**Expected Results:**
- Error message is displayed clearly
- Application does not crash
- User can recover and try again
- Error state is clear

#### 11.2 Network Load Failure
**Steps:**
1. Attempt to load network when server is unavailable
2. Or load corrupted file

**Expected Results:**
- Error handling is graceful
- User-friendly error message
- Application remains functional
- Option to retry or cancel

### 12. Authentication (Optional - Requires NDEx Account)

#### 12.1 Login Button Visibility
**Steps:**
1. Observe top toolbar
2. Locate login button

**Expected Results:**
- "Click to login" button is visible
- Button is in top right area
- Button is clickable

#### 12.2 Login Flow
**Steps:**
1. Click "Click to login" button
2. Complete authentication flow (if test environment supports)

**Expected Results:**
- Login dialog or redirect occurs
- Authentication completes successfully
- User state is updated
- NDEx options become enabled

**Note:** Full authentication testing may require mock Keycloak or test environment setup

### 13. Export Operations

#### 13.1 Export Menu Access
**Steps:**
1. Load a network
2. Click "Data" menu
3. Click "Export" submenu

**Expected Results:**
- Export submenu opens
- Export options are visible
- Options are enabled when network is loaded

#### 13.2 Export Network to Image
**Steps:**
1. Load a network
2. Click "Data" → "Export" → "Export Network to Image"
3. Select format (PNG, SVG, etc.)
4. Complete export

**Expected Results:**
- Export dialog opens
- Format options are available
- Image exports successfully
- Image file downloads
- Image matches network view

### 14. Help and Documentation

#### 14.1 Help Menu
**Steps:**
1. Click "Help" menu button
2. Observe menu options

**Expected Results:**
- Help menu opens
- Options include documentation links, tutorials, etc.

#### 14.2 License Menu
**Steps:**
1. Click "License" menu button
2. Observe license information

**Expected Results:**
- License information is displayed
- License text is readable
- Dialog or page is accessible

## Test Execution Notes

### Test Independence
- Each test scenario should be independent and runnable in any order
- Tests assume fresh state unless otherwise specified
- Use `tests/seed.spec.ts` for common setup if needed

### Data Test IDs
Where possible, use `data-testid` attributes for reliable element selection:
- `data-testid="workspace-editor"`
- `data-testid="toolbar-data-menu-button"`
- `data-testid="load-from-ndex-dialog"`
- `data-testid="load-from-ndex-search-input"`
- `data-testid="load-from-ndex-search-button"`
- `data-testid="load-from-ndex-network-checkbox-<UUID>"`

### Fixtures
Test data is available in `test/fixtures/`:
- Valid CX2 files: `test/fixtures/cx2/valid/`
- Invalid CX2 files: `test/fixtures/cx2/invalid/`
- Table files: `test/fixtures/tables/`
- NDEx networks: `test/fixtures/ndex/`

### Negative Testing
Each feature area should include negative test cases:
- Invalid input handling
- Disabled state verification
- Error message validation
- Edge case handling

### Performance Considerations
- Network loading may take time - use appropriate waits
- Large networks may impact performance - test with various sizes
- Layout algorithms may take time to complete

## Success Criteria

### Functional Requirements
- All menu options work as expected
- Network loading and rendering is reliable
- Table operations function correctly
- Style changes apply immediately
- Panel management works smoothly

### User Experience
- Interface is responsive
- Error messages are clear and helpful
- Loading states are indicated
- Operations provide feedback

### Data Integrity
- Networks load with correct node/edge counts
- Table data matches network data
- Exports match displayed networks
- Imports preserve data structure

## Future Test Scenarios

The following scenarios are identified but may require additional setup or instrumentation:

1. **Layout Execution Verification**: Verify default layout runs and fit occurs (requires test hooks)
2. **File Import Workflows**: Complete file import flows with all supported formats
3. **Authentication Integration**: Full Keycloak authentication flow testing
4. **Service Apps**: Testing of service-based apps integration
5. **Hierarchical View**: Testing of hierarchical/cell view features
6. **Visual Regression**: Screenshot comparison for visual changes
7. **Performance Testing**: Load testing with large networks
8. **Cross-browser Testing**: Verify functionality across Chrome, Firefox, Safari

