# DataMenu Feature

## Overview

The `DataMenu` feature implements the **Data** toolbar menu. It centralizes all operations related to **loading, saving, importing, exporting, and cleaning up networks and workspaces**. It is the main entry point for interacting with NDEx, files, demo networks, and table joins.

## Architecture

- **UI Component**
  - `index.tsx` (`DataMenu`): Renders the **Data** trigger and its `DropdownMenu`, and owns every dialog the menu's rows open (see [Dialogs](#dialogs)).

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
    - `ExportNetworkToImageMenuItem` (`ExportImageMenuItem`): Opens the `ExportImage` dialog (`PdfExportForm`/`PngExportForm`/`SvgExportForm`) to export the network view as an image or PDF.
  - **Cleanup**
    - `RemoveNetworkMenuItem`: Remove the current network from the workspace.
    - `RemoveAllNetworksMenuItem`: Remove all networks.
    - `ResetLocalWorkspaceMenuItem`: Clear cached workspace state and reset local data.

The main `DataMenu` component wires these items into a hierarchical menu model.

## Behavior

### Menu Layout

- The `DataMenu` builds a `menuItems` array passed to `DropdownMenu`, grouping related operations:
  - **Open from NDEx / Workspace / Sample Networks**
  - **Open in Cytoscape Desktop**
  - **Import** (file import + table join)
  - **Save / Copy / Download / Export**
  - **Remove / Reset**
- Separator items (`{ separator: true }`) visually segment logical groups.

### Interaction Flow

- **Opening the menu**
  - Clicking the **Data** button toggles the `DropdownMenu` anchored to it (inside the toolbar's `MenuBar`).
- **Executing actions**
  - Each item is rendered as a template row component (e.g. `LoadFromNdexMenuItem`). A row decides whether it is enabled and what its tooltip says, and calls its `onClick`.
  - An immediate action (Open Sample Networks, Download, a Save Workspace overwrite) closes the menu and continues in the background, reporting failures through the message snackbar.

### Dialogs

No row renders a dialog. A row is unmounted with the menu, and a dialog rendered inside it is a React child of the menu but lives in its own DOM portal, so every click, focus change or key in the dialog made the menu guess whether the dialog was still "inside" it. Every wrong guess closed the menu and unmounted the dialog (#784). `DataMenu` owns each dialog instead: the row's `onClick` closes the menu, then opens the dialog.

| Row                                        | Dialog (owned by `DataMenu`)                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Open Network(s) from NDEx                  | `LoadFromNdexDialog` (state in `loadFromNdexDialogStore`)                                  |
| Open Workspace from NDEx                   | `LoadWorkspaceDialog`                                                                      |
| Open Network in Cytoscape Desktop          | `CytoscapeDesktopPermissionDialog`, first use only (`useCytoscapeDesktopPermissionNotice`) |
| Import › Network from File                 | `FileUpload` (state in `fileUploadDialogStore`, lazy)                                      |
| Save Network to NDEx                       | HCX warning and "Networks out of sync", from `useSaveNetworkToNDExFlow`                    |
| Save Copy to NDEx                          | HCX warning, from `useSaveNetworkCopyToNDExFlow`                                           |
| Save Workspace / Save Workspace As         | `WorkspaceNamingDialog`, mounted only while open                                           |
| Export › Network to Image                  | `ExportImage` (lazy, re-keyed on every open)                                               |
| Remove / Remove All / Clear Local Database | `ConfirmationDialog`                                                                       |

- A flow whose dialog opens only after async work (the NDEx saves) lives in a hook the menu calls. It returns `{ start, dialogs }` and reads network data from the stores when the save runs, so the always-mounted menu subscribes to none of it.
- A dialog that stays mounted and only toggles `open` re-keys itself on every open, so its fields re-seed (`ExportImage`). A dialog that subscribes to the whole workspace mounts only while open (`WorkspaceNamingDialog`).
- `src/features/ToolBar/menuRowDialogs.test.ts` fails if a row, or anything it renders or lazy-loads, renders a dialog.
- **State & Store Integration**
  - Individual menu items integrate with various stores:
    - `WorkspaceStore` for managing networks/workspaces
    - `NetworkStore`, `TableStore`, `NetworkSummaryStore` for network/table data
    - `UiStateStore` for view state
    - NDEx and file APIs for persistence

## Design Decisions

- **Single Entry Point for Data Operations**
  - Concentrates all data-related actions under one menu, making it easier for users to find operations.

- **Rows decide, the menu hosts**
  - Each menu item is a small component that computes its enabled state and tooltip.
  - `DataMenu` owns layout, closing, and every dialog and multi-step flow (see [Dialogs](#dialogs)).

- **`DropdownMenu`**
  - Enables nested grouping (e.g. Import → From File / Import Table) and template rows.

- **Close-on-Action Pattern**
  - Every row closes the menu when it acts, before any dialog shows, so no menu is left open under a dialog.

## Related Documentation

- `DataMenu_docs/WorkspaceMenuItems.md` - Detailed documentation for workspace menu items (Load, Save, Overwrite)

## Future Improvements

- Add recent networks/workspaces section for quick reopening.
- Surface NDEx connection status and active account in the menu header.
- Add keyboard shortcuts for high-frequency operations (e.g. Save, Download, Reset).
- Provide a "dry-run" or preview mode for destructive operations like Remove All Networks.
