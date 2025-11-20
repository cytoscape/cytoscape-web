# useLoadWorkspace Hook Documentation

## Overview

The `useLoadWorkspace` hook provides a function to load a remote workspace from NDEx into the local IndexedDB database. This hook orchestrates the complete workspace restoration process, including database clearing, workspace data import, app status synchronization, and service app management.

## Purpose

This hook solves the problem of **workspace restoration** - loading a complete workspace state (networks, apps, service apps, and configuration) from a remote NDEx workspace into the local application. It ensures that:

- All existing data is cleared before loading (prevents conflicts)
- Workspace metadata is correctly restored
- App activation states match the saved workspace
- Service apps are properly fetched and configured
- The application state is fully synchronized with the remote workspace

## Architecture

The hook follows a **transactional, step-by-step approach**:

1. **Database Clearing** - Removes all existing data to prevent conflicts
2. **Workspace Import** - Writes the workspace metadata to the database
3. **App Status Synchronization** - Updates app activation states based on workspace configuration
4. **Service App Management** - Fetches, adds, and removes service apps as needed
5. **Error Handling** - Continues with workspace import even if app/service app operations fail

Each step is wrapped in try-catch blocks to ensure partial failures don't prevent workspace loading.

## How It Works

### Database Clearing

The hook starts by calling `deleteDb()`, which completely clears the IndexedDB database. This ensures a clean slate for the imported workspace and prevents data conflicts or inconsistencies.

### Workspace Import

The remote workspace data is transformed into the local `Workspace` model and written to the database. The transformation includes:

- Workspace ID and name
- Network IDs (which networks are in the workspace)
- Current network ID (which network is active)
- Creation and modification timestamps
- Remote flag (marks this as a remote workspace)

### App Status Synchronization

The hook synchronizes app activation states between:
- **Workspace configuration** - Which apps should be active (from `options.activeApps`)
- **Current app store** - Which apps are currently active in memory
- **Database** - Which apps are stored in IndexedDB

The synchronization logic:
- Activates apps that should be active but aren't
- Deactivates apps that shouldn't be active but are
- Adds new apps to the database if they exist in the current app store

### Service App Management

Service apps are managed through a three-step process:

1. **Removal** - Removes service apps from the database that are not in the workspace's service app list
2. **Addition** - Adds service apps that are in the workspace list but not in the database
3. **Update** - Updates existing service apps with current store data if available

The hook prefers store data over fetching when available, reducing unnecessary network requests. If a service app exists in the current store, it uses that data. Otherwise, it fetches the service app metadata from the URL.

### Error Handling

The hook uses a **graceful degradation** approach:

- Workspace import always proceeds (critical operation)
- App status updates can fail without blocking workspace import
- Service app operations can fail individually without blocking other service apps
- Errors are logged but don't prevent the workspace from loading

This ensures that even if some operations fail (e.g., network issues fetching service apps), the workspace is still loaded and usable.

## Usage

### Basic Usage

```typescript
const loadWorkspace = useLoadWorkspace()

await loadWorkspace(
  remoteWorkspace,
  currentApps,
  currentServiceApps
)
```

### With Custom Service Fetcher

```typescript
const customFetcher = async (url: string) => {
  // Custom fetching logic
  return serviceApp
}

const loadWorkspace = useLoadWorkspace(customFetcher)
```

## Parameters

### loadWorkspace Function

- `selectedWorkspace: RemoteWorkspace` - The remote workspace to load from NDEx
- `currentApps: Record<string, CyApp>` - Current apps in the app store (for status updates)
- `currentServiceApps: Record<string, ServiceApp>` - Current service apps in the app store

### Hook Parameters

- `serviceFetcherFn?: ServiceAppFetcher` - Optional function to fetch service app metadata (defaults to `serviceFetcher` from AppStore)

## Design Decisions

### Why Clear the Database First?

Clearing the database before import ensures:
- No data conflicts between old and new workspace
- Clean state that matches the remote workspace exactly
- Prevents orphaned data from previous sessions
- Simplifies the import process (no merge logic needed)

### Why Prefer Store Data Over Fetching?

When a service app exists in the current store, the hook uses that data instead of fetching because:
- Reduces unnecessary network requests
- Faster workspace loading
- Uses already-validated data
- Handles offline scenarios better

### Why Continue on Partial Failures?

The hook continues with workspace import even if app/service app operations fail because:
- Workspace data is the most critical
- Users can still work with the workspace even if some apps aren't configured
- Better user experience (workspace loads, then user can fix issues)
- Allows for graceful degradation

### Why Separate Transactions?

Each major operation (workspace write, app updates, service app updates) is in its own try-catch block to:
- Isolate failures (one failure doesn't affect others)
- Provide better error logging
- Allow partial success
- Make debugging easier

## Limitations

1. **No Network Data Import**: The hook only imports workspace metadata. Network data must be loaded separately through the normal network loading mechanisms.

2. **No Rollback**: If the workspace import fails after database clearing, there's no automatic rollback. The database remains cleared.

3. **Service App Fetching**: If a service app URL is invalid or unreachable, it's silently skipped (logged but not shown to user).

4. **No Validation**: The hook doesn't validate that network IDs in the workspace actually exist or are accessible.

## Future Enhancements

Potential improvements:

- Network data pre-loading during workspace import
- Rollback mechanism for failed imports
- Better error reporting to users
- Validation of network IDs before import
- Batch operations for better performance
- Progress indicators for long-running operations

## Integration

- **Used by**: `LoadWorkspaceDialog` component
- **Depends on**: Database operations (`deleteDb`, `putWorkspaceToDb`, etc.), AppStore (`serviceFetcher`), NDEx API (for fetching workspaces)

## Related Files

- `useLoadWorkspace.ts` - Hook implementation
- `useLoadWorkspace.test.ts` - Test suite
- `LoadWorkspaceDialog.tsx` - UI component that uses the hook
