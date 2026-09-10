# HelpMenu Feature

## Overview

The `HelpMenu` feature implements the **Help** toolbar menu. It centralizes links and tools for learning, troubleshooting, and contributing to Cytoscape Web:

- About dialog and project information
- Tutorials and developer documentation
- Database import/export tools
- Citation and bug report shortcuts

## Architecture

- **UI Component**
  - `index.tsx` (`HelpMenu`): Renders the **Help** trigger through the toolbar's `DropdownMenu`, defines the menu model, and owns the open state of every Help dialog (`openDialog: HelpDialog | null`, one at a time).

- **Menu Item Components** (rows only — each renders a `DropdownMenuItem` and calls the `onClick` it is given)
  - `AboutCytoscapeWebMenuItem`, `LicenseMenuItem`, `CitationMenuItem`, `BugReportMenuItem`, `ImportDatabaseMenuItem`: open a dialog owned by `HelpMenu`.
  - `TakeATourMenuItem`, `TutorialMenuItem`, `DeveloperMenuItem`, `CodeRepositoryMenuItem`: navigate (tour, tutorials, developer guide, GitHub).
  - `ExportDatabaseMenuItem`: Exports the internal Dexie/IndexedDB database to a file.

- **Dialog Components** (rendered by `HelpMenu` next to the menu, never inside a row)
  - `AboutDialog`: Application information (version link, build id, cache version).
  - `LicenseDialog`: The MIT license text.
  - `CitationDialog`: The papers to cite, with a copy button.
  - `BugReportDialog`: Loads the Atlassian issue collector.
  - `ImportDatabaseSnapshotDialog` (lazy): file picker, then a confirmation; imports a database snapshot into the local cache and reloads.

## Behavior

### Menu Layout

The menu items are grouped logically:

- **General**
  - About Cytoscape Web
  - Tutorial

- **Developer Tools**
  - Developer's Guide
  - Export Database
  - Import Database

- **Project & Community**
  - Code Repository
  - Citation
  - Bug Report

Dividers are used to separate these groups visually.

### Interaction Flow

- Clicking the **Help** trigger opens the toolbar `DropdownMenu` (a non-modal Popper shared with the other menus; see `MenuBar`).
- Rows that navigate call `handleClose` after starting the action.
- Rows that open a dialog call `openDialogFromMenu(<dialog>)`, which closes the menu first and then sets `openDialog`; the dialog's own Close button clears it. The menu is gone by the time the dialog shows, so the dialog stands alone.

## Design Decisions

- **Dialogs are owned by `HelpMenu`, not by their rows**
  - A row lives inside the menu Popper and is unmounted whenever the menu closes — and the menu closes on focus-out, which a dialog's focus trap triggers. State kept in the row would vanish with it (this was a real regression after the menubar rework). Keeping the dialog beside the menu, as `LicenseDialog` always did, makes its lifetime independent of the menu.
  - `DropdownMenu` still tolerates a row that renders its own portaled dialog (other menus and app-supplied rows do), but the Help menu does not rely on that.

- **Separation of Concerns**
  - `HelpMenu` defines the menu structure and which dialog is open.
  - Each row component is presentation only; each dialog component encapsulates its own UI and side-effects.

- **Developer Tools in Help**
  - Developer-oriented actions live under Help rather than a separate toolbar menu to keep the main toolbar compact while still discoverable.

## Future Improvements

- Add a searchable command palette that reuses Help menu entries.
- Surface current version and update availability in the Help header.
- Add a consolidated diagnostics/export log tool for easier bug reporting.
