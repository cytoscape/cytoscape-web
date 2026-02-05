# HelpMenu Feature

## Overview

The `HelpMenu` feature implements the **Help** toolbar menu. It centralizes links and tools for learning, troubleshooting, and contributing to Cytoscape Web:

- About dialog and project information
- Tutorials and developer documentation
- Database import/export tools
- Citation and bug report shortcuts

## Architecture

- **UI Component**
  - `HelpMenu.tsx`: Renders the **Help** button and a PrimeReact `OverlayPanel` with a `TieredMenu`.

- **Menu Item Components**
  - `AboutCytoscapeWebMenuItem`: Shows application information (version, links, etc.).
  - `TutorialMenuItem`: Links to end-user tutorials.
  - `DeveloperMenuItem`: Links to developer guide and technical docs.
  - `ExportDatabaseMenuItem`: Exports the internal Dexie/IndexedDB database to a file.
  - `ImportDatabaseMenuItem`: Imports a database snapshot into the local cache.
  - `CodeRepositoryMenuItem`: Links to the GitHub repository.
  - `CitationMenuItem`: Shows citation instructions for Cytoscape Web.
  - `BugReportMenuItem`: Links to issue tracker or bug-reporting form.

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

- Clicking the **Help** button opens a PrimeReact `OverlayPanel` anchored to the button.
- The `TieredMenu` renders menu items using React templates, each responsible for:
  - Opening dialogs (e.g. About, Export/Import database)
  - Navigating to external URLs (tutorials, docs, repository, bug tracker)
- A shared `handleClose` callback is passed into menu item components where needed so they can close the overlay after initiating an action.

## Design Decisions

- **PrimeReact TieredMenu**
  - Keeps Help menu visually and behaviorally consistent with Data and Analysis menus.
  - Supports nested developer sub-menu without additional layout code.

- **Separation of Concerns**
  - `HelpMenu` only defines menu structure and wires up the overlay.
  - Each menu item component encapsulates its own UI and side-effects (dialog open, navigation, database export/import).

- **Developer Tools in Help**
  - Developer-oriented actions live under Help rather than a separate toolbar menu to keep the main toolbar compact while still discoverable.

## Future Improvements

- Add a searchable command palette that reuses Help menu entries.
- Surface current version and update availability in the Help header.
- Add a consolidated diagnostics/export log tool for easier bug reporting.
