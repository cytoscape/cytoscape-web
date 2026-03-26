# 0004: NDEx Folder Support in LoadFromNdexDialog

## Status

Accepted

## Context

NDEx v3 introduces a folder/file system where users can organize networks into hierarchical folders, create shortcuts, and control visibility (PUBLIC, PRIVATE, UNLISTED — modeled after YouTube's three-state video visibility). The `ndex-client@0.6.0-alpha.4` package exposes a `files` API module with `searchFiles()`, `getFolderList()`, `getFolder()`, and `getShortcut()` operations.

Cytoscape Web's `LoadFromNdexDialog` currently has two tabs:

1. **SEARCH NDEx** — public keyword search returning a flat list of networks
2. **My Networks** — flat list of all networks belonging to the authenticated user

This architecture has two problems:

- **No folder awareness** — users who organize networks into folders on NDEx3 see a flattened view in CW5, losing their organizational structure
- **No visibility distinction** — search results mix public, private, and shared networks without separation, unlike NDEx3's three-tab model

The dialog's purpose in CW5 is fundamentally **read-only**: browse and select networks to load into the workspace. It is not a file manager — no CRUD operations on folders/networks are needed.

## Decision

Refactor `LoadFromNdexDialog` to mirror NDEx3's search results UI, adapted for CW5's browse-and-load purpose:

### Tab Structure

| Auth State | UI |
|---|---|
| Not logged in | No tabs. Single search bar + public results (folders + networks). |
| Logged in | Search bar above three tabs: **My Networks** \| **Public** \| **Private & Unlisted** |

### Key Design Points

- **Search bar above all tabs** — a single search input filters results across all tabs simultaneously, replacing the current per-tab search approach.
- **My Networks defaults to home folder** — when the dialog opens (no search query), the My Networks tab shows the user's home folder contents via `files.getFolderList('home')`. Other tabs remain empty until a search is entered.
- **Results grouped by type** — each tab renders a **Folders** section (top) followed by a **Networks** section (below), matching NDEx3's `splitByType()` pattern.
- **Folders are navigable** — clicking a folder drills into its contents within the dialog. A breadcrumb bar enables navigation back to parent folders or search results.
- **Shortcuts are resolved** — shortcuts to networks are displayed as loadable networks. Shortcuts to folders are displayed as navigable folders.
- **Read-only / browse-only** — no Actions column, no context menus, no folder CRUD, no drag-and-drop. The only user action is selecting networks via checkboxes and clicking "Open".
- **Existing constraints preserved** — size thresholds, collection exclusion, and "already loaded" disabling remain unchanged.

### Dependency

Upgrade `@js4cytoscape/ndex-client` from `^0.4.3-alpha.12` to `^0.6.0-alpha.4` to access the `files` API module (`searchFiles`, `getFolderList`, `getFolder`, `getShortcut`).

## Rationale

### Alternative 1: Add a separate "My Folders" tab (rejected)

Add a third tab alongside the existing Search and My Networks tabs for folder browsing.

**Rejected because:**

- Creates an inconsistent mental model — "My Networks" would remain a flat list while "My Folders" introduces hierarchy, forcing users to choose where to look
- Does not address the visibility separation (public vs. private vs. unlisted) that NDEx3 now provides
- The NDEx3 team has already validated the three-tab model with users; diverging creates confusion for users who use both applications

### Alternative 2: Full file manager in CW5 (rejected)

Replicate NDEx3's full MyAccount experience (sidebar, drag-drop, context menus, CRUD, sharing, trash) inside CW5's dialog.

**Rejected because:**

- CW5's dialog purpose is narrowly scoped to "select and load networks" — file management belongs in NDEx3
- Adds significant complexity and maintenance burden for features CW5 users do not need
- Duplicates NDEx3 functionality, creating two places to maintain the same UI

### Alternative 3: Keep flat list, just upgrade search (rejected)

Use the new `searchFiles` API but display results as a flat list without folder grouping or navigation.

**Rejected because:**

- Loses the organizational context that folders provide — users cannot browse their folder structure
- The `searchFiles` API returns folders alongside networks; hiding folders discards useful information
- Does not match NDEx3's visual language, creating inconsistency for users of both apps

## Consequences

**Affected areas:**

- `LoadFromNdexDialog.tsx` — major refactor from 2-tab to conditional 3-tab layout with folder/network grouping
- `src/data/external-api/ndex/` — new `files.ts` module wrapping ndex-client's `files` API
- `package.json` — ndex-client version bump (may affect other NDEx API call sites)

**Trade-offs:**

- Increased dialog complexity — folder drill-in with breadcrumbs adds state management (current folder ID, breadcrumb stack) that the current flat list does not have
- My Networks tab has dual behavior — shows home folder contents when search is empty, switches to search results when a query is entered. This is intentional to match the "Google Drive + search" pattern but adds conditional logic
- ndex-client upgrade may introduce breaking changes in existing API calls — requires verification of all current `ndex-client` usage sites

**Related documents:**

- NDEx3 search implementation: `ndex3/src/app/search/_components/SearchResultsPage.tsx`
- NDEx3 file search hook: `ndex3/src/hooks/use-file-search.ts`
- NDEx3 folder hook: `ndex3/src/hooks/use-folder.ts`
