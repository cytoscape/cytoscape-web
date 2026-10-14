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
  - `TakeATourMenuItem`, `TutorialMenuItem`, `DeveloperMenuItem`, `CodeRepositoryMenuItem`: navigate (tour, user manual, developer guide, GitHub).
  - `ExportDatabaseMenuItem`: Exports the internal Dexie/IndexedDB database to a file.

- **Dialog Components** (rendered by `HelpMenu` next to the menu, never inside a row)
  - `AboutDialog`: A short description with links to the code repository, Cytoscape Desktop and the Cytoscape home page; build information (version linked to the release notes, build id, build date, cache version) with a copy button; and a link to the Cytoscape Web roadmap. The URLs are exported constants (`CODE_REPO_URL`, `CYTOSCAPE_DESKTOP_URL`, `CYTOSCAPE_HOME_URL`, `RELEASE_NOTES_URL`, `ROADMAP_URL`) and every link opens in a new tab with `rel="noopener noreferrer"`.
  - `LicenseDialog`: The MIT license text, with a copy button.
  - `CitationDialog`: The papers to cite, with a copy button.
  - `BugReportDialog`: Asks for reproduction steps and data, and loads the Atlassian issue collector. The **Report a Bug** button (`id="myCustomTrigger"`) stays disabled until the collector has attached its click handler; the collector's description is pre-filled with the version, operating system and browser (`getIssueEnvironment`), so the dialog does not ask for them.

  Each dialog closes through the Close "X" in its top-right corner (`components/DialogCloseButton.tsx`, test id `<dialog>-close-button`). Bug Report also has a **Cancel** button next to its main action. Backdrop click and Esc are inert, as everywhere (`docs/specifications/DIALOG_DISMISS_POLICY.md`).
  - `ImportDatabaseSnapshotDialog` (lazy): file picker, then a confirmation; imports a database snapshot into the local cache and reloads.

## Behavior

### Menu Layout

The menu, top to bottom (`---` marks a divider):

- About Cytoscape Web
- ---
- Take a tour
- User Manual: opens `web-manual.cytoscape.org`
- **Developer** (submenu)
  - Developer's Guide: opens the
    [Cytoscape-Web-Developer-Tutorial](https://github.com/cytoscape/cytoscape-web/wiki/Cytoscape-Web-Developer-Tutorial)
    wiki page, which sends app developers and core developers to their own
    docs. Every released version links to this URL, so the page keeps its
    name.
  - Code Repository: opens the GitHub repository
  - ---
  - Export Database Snapshot
  - Import Database Snapshot...
- License
- ---
- Citation
- ---
- Report a Bug

Items from service apps whose `cyWebMenuItem.root` resolves to Help are added
by `appendServiceMenuItems`. A service submenu with the same label as a
built-in submenu (for example **Developer**) is merged into it. Every other
item is appended after a divider at the bottom.

### Interaction Flow

- Clicking the **Help** trigger opens the toolbar `DropdownMenu` (a non-modal Popper shared with the other menus; see `MenuBar`).
- Rows that navigate call `handleClose` after starting the action.
- Rows that open a dialog call `openDialogFromMenu(<dialog>)`, which closes the menu first and then sets `openDialog`; the dialog's Close "X" clears it. The menu is gone by the time the dialog shows, so the dialog stands alone.

## Design Decisions

- **Dialogs are owned by `HelpMenu`, not by their rows**
  - A row lives inside the menu Popper and is unmounted whenever the menu closes — and the menu closes on focus-out, which a dialog's focus trap triggers. State kept in the row would vanish with it (this was a real regression after the menubar rework). Keeping the dialog beside the menu, as `LicenseDialog` always did, makes its lifetime independent of the menu.
  - No toolbar menu row renders a dialog any more (`menuRowDialogs.test.ts` enforces it), and `DropdownMenu` no longer tolerates one.

- **Separation of Concerns**
  - `HelpMenu` defines the menu structure and which dialog is open.
  - Each row component is presentation only; each dialog component encapsulates its own UI and side-effects.

- **Developer Tools in Help**
  - Developer-oriented actions live under Help rather than a separate toolbar menu to keep the main toolbar compact while still discoverable.

## Future Improvements

- Add a searchable command palette that reuses Help menu entries.
- Surface current version and update availability in the Help header.
- Add a consolidated diagnostics/export log tool for easier bug reporting.
