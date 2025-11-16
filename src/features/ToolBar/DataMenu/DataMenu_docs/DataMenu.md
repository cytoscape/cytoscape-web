# DataMenu Feature

## Overview

The `DataMenu` feature implements the **Data** toolbar menu. It centralizes all operations related to **loading, saving, importing, exporting, and cleaning up networks and workspaces**. It is the main entry point for interacting with NDEx, files, demo networks, and table joins.

## Architecture

- **UI Component**
  - `DataMenu.tsx`: Renders the **Data** button and a PrimeReact `OverlayPanel` with a `TieredMenu`.

- **Menu Item Components**
  - **Loading / Opening**
    - `LoadFromNdexMenuItem`: Search and load networks from NDEx.
    - `LoadWorkspaceMenuItem`: Load saved workspaces from NDEx.
    - `LoadDemoNetworksMenuItem`: Load sample/demo networks.
    - `OpenNetworkInCytoscapeMenuItem`: Open current network in Cytoscape Desktop.
  - **Import**
    - `ImportNetworkFromFileMenuItem` (`UploadNetworkMenuItem`): Import networks from local files (e.g. CX/CSV).
    - `JoinTableToNetworkMenuItem`: Join external tables to existing networks (TableDataLoader integration).
  - **Saving / Exporting**
    - `SaveToNDExMenuItem`: Save current network to NDEx.
    - `CopyNetworkToNDExMenuItem`: Copy network to NDEx as a new entry.
    - `DownloadNetworkMenuItem`: Download network data.
    - `SaveWorkspaceToNDExMenuItem`: Save current workspace to NDEx.
    - `SaveWorkspaceToNDExOverwriteMenuItem`: Overwrite an existing NDEx workspace.
    - `ExportNetworkToImageMenuItem` (`ExportImageMenuItem` + `PdfExportForm`/`PngExportForm`/`SvgExportForm`): Export network view as image/PDF.
  - **Cleanup**
    - `RemoveNetworkMenuItem`: Remove the current network from the workspace.
    - `RemoveAllNetworksMenuItem`: Remove all networks.
    - `ResetLocalWorkspaceMenuItem`: Clear cached workspace state and reset local data.

The main `DataMenu` component wires these items into a hierarchical menu model.

## Behavior

### Menu Layout

- The `DataMenu` builds a `menuItems` array passed to `TieredMenu`, grouping related operations:
  - **Open from NDEx / Workspace / Sample Networks**
  - **Open in Cytoscape Desktop**
  - **Import** (file import + table join)
  - **Save / Copy / Download / Export**
  - **Remove / Reset**
- Dividers (`<Divider />`) are used to visually segment logical groups.

### Interaction Flow

- **Opening the menu**
  - Clicking the **Data** button toggles the PrimeReact `OverlayPanel` anchored to the button.
- **Executing actions**
  - Each item is rendered as a custom React template component (e.g. `LoadFromNdexMenuItem`) which:
    - Executes the domain-specific operation
    - Receives a `handleClose` callback to close the overlay after completion or cancellation
- **State & Store Integration**
  - Individual menu items integrate with various stores:
    - `WorkspaceStore` for managing networks/workspaces
    - `NetworkStore`, `TableStore`, `NetworkSummaryStore` for network/table data
    - `UiStateStore` for view state
    - NDEx and file APIs for persistence

## Design Decisions

- **Single Entry Point for Data Operations**
  - Concentrates all data-related actions under one menu, making it easier for users to find operations.

- **Composable Menu Items**
  - Each menu item is a self-contained component responsible for its own UI and logic.
  - `DataMenu` only coordinates layout and closure behavior.

- **PrimeReact TieredMenu**
  - Enables nested grouping (e.g. Import → From File / Import Table).
  - Supports rich templates for complex dialog-launching items.

- **Close-on-Action Pattern**
  - Every menu item receives `handleClose` to hide the overlay after triggering an action, avoiding menus left open after operations.

## Future Improvements

- Add recent networks/workspaces section for quick reopening.
- Surface NDEx connection status and active account in the menu header.
- Add keyboard shortcuts for high-frequency operations (e.g. Save, Download, Reset).
- Provide a "dry-run" or preview mode for destructive operations like Remove All Networks.
