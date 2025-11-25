# Workspace Menu Items Documentation

## Overview

The workspace menu items in the DataMenu provide functionality for saving and loading workspaces to/from NDEx. These menu items enable users to persist their workspace state (networks, apps, service apps, and configuration) to NDEx and restore it later.

## Purpose

These components solve the problem of **workspace persistence and sharing** - allowing users to:

- Save their current workspace state to NDEx for backup or sharing
- Load previously saved workspaces from NDEx
- Overwrite existing workspaces on NDEx
- Manage workspace naming and organization

## Components

### LoadWorkspaceMenuItem

Menu item that opens a dialog to load a workspace from NDEx.

**Behavior:**

- Only enabled when user is authenticated
- Shows tooltip explaining authentication requirement when disabled
- Opens `LoadWorkspaceDialog` when clicked
- Closes the parent menu when dialog opens

**Integration:**

- Uses `KeycloakContext` to check authentication status
- Integrates with `LoadWorkspaceDialog` for workspace selection and loading

### LoadWorkspaceDialog

Dialog component that displays a list of user's workspaces from NDEx and allows loading one.

**Behavior:**

- Fetches user's workspaces from NDEx when opened
- Displays workspaces in a table with name, modification date, and network count
- Allows selecting a workspace by clicking a row
- Shows confirmation dialog before loading (warns about replacing existing networks)
- Calls `useLoadWorkspace` hook to load the selected workspace
- Reloads the page after successful workspace load
- Allows deleting workspaces (with confirmation)
- Shows error messages for failed operations

**Key Features:**

- **Confirmation Dialog**: Warns users that loading a workspace will replace all existing networks
- **Error Handling**: Shows user-friendly error messages for failed operations
- **Workspace Selection**: Visual feedback for selected workspace
- **Delete Functionality**: Allows removing workspaces from NDEx

**Integration:**

- Uses `useLoadWorkspace` hook for workspace loading
- Integrates with NDEx API for fetching and deleting workspaces
- Uses `useAppStore` and `useWorkspaceStore` for current state

### SaveWorkspaceToNDExMenuItem

Menu item that saves the current workspace to NDEx with a new name.

**Behavior:**

- Only enabled when user is authenticated AND workspace has at least one network
- Shows tooltip explaining requirements when disabled
- Opens `WorkspaceNamingDialog` when clicked
- Creates a new workspace on NDEx (doesn't overwrite existing)

**Integration:**

- Uses `WorkspaceNamingDialog` for workspace naming
- Integrates with `useSaveWorkspaceToNDEx` hook (via dialog)

### SaveWorkspaceToNDExOverwriteMenuItem

Menu item that overwrites the current remote workspace on NDEx.

**Behavior:**

- Only enabled when user is authenticated AND workspace has at least one network AND current workspace is a remote workspace
- Shows tooltip explaining requirements when disabled
- If workspace is remote, directly saves to NDEx (overwrites existing)
- If workspace is local, opens `WorkspaceNamingDialog` to create a new workspace first
- Shows error messages for failed operations

**Key Features:**

- **Conditional Behavior**: Different behavior for remote vs local workspaces
- **Direct Save**: For remote workspaces, saves immediately without dialog
- **Error Handling**: Shows user-friendly error messages

**Integration:**

- Uses `useSaveWorkspaceToNDEx` hook for saving
- Uses `useWorkspaceData` hook for current workspace state
- Integrates with `WorkspaceNamingDialog` for local workspaces

### WorkspaceNamingDialog

Dialog component for naming a workspace before saving to NDEx.

**Behavior:**

- Allows entering a workspace name
- Validates workspace name (checks for duplicates, length, etc.)
- Fetches existing workspace names to check for duplicates
- Creates new workspace on NDEx when saved
- Shows error messages for failed operations
- Handles both "save as" and "overwrite" scenarios

**Key Features:**

- **Duplicate Detection**: Checks if workspace name already exists
- **Validation**: Ensures workspace name meets requirements
- **Error Handling**: Shows user-friendly error messages

**Integration:**

- Uses `useSaveWorkspaceToNDEx` hook for saving
- Integrates with NDEx API for checking duplicates and creating workspaces

## User Flow

### Loading a Workspace

1. User clicks "Open Workspace from NDEx..." menu item
2. Dialog opens showing list of user's workspaces
3. User selects a workspace from the table
4. User clicks "Open" button
5. Confirmation dialog appears warning about replacing existing networks
6. User confirms
7. Workspace is loaded (database cleared, workspace imported, apps/service apps updated)
8. Page reloads to show the loaded workspace

### Saving a Workspace (New)

1. User clicks "Save Workspace As..." menu item
2. Naming dialog opens
3. User enters workspace name
4. System checks for duplicate names
5. User clicks "Save"
6. Workspace is saved to NDEx
7. Success message is shown

### Saving a Workspace (Overwrite)

1. User clicks "Update Workspace on NDEx" menu item (only visible for remote workspaces)
2. Workspace is immediately saved to NDEx (overwrites existing)
3. Success/error message is shown

## Design Decisions

### Why Require Authentication?

All workspace operations require authentication because:
- Workspaces are user-specific data stored on NDEx
- NDEx requires authentication for workspace operations
- Prevents unauthorized access to user data
- Better security model

### Why Show Confirmation Dialog for Loading?

The confirmation dialog warns users that loading a workspace will replace all existing networks because:
- This is a destructive operation (clears current workspace)
- Users may not realize the impact
- Prevents accidental data loss
- Aligns with similar confirmation patterns (e.g., database import)

### Why Separate "Save As" and "Overwrite" Menu Items?

Having separate menu items for "Save As" and "Overwrite" provides:
- Clear user intent (create new vs update existing)
- Different workflows for each operation
- Better UX (no need to check if workspace exists first)
- Prevents accidental overwrites

### Why Reload Page After Loading Workspace?

The page reloads after loading a workspace because:
- Workspace loading clears the entire database
- All application state needs to be refreshed
- Ensures UI is in sync with new workspace data
- Simpler than manually updating all stores
- Prevents stale state issues

### Why Prefer Store Data for Service Apps?

When loading a workspace, service apps are preferred from the store over fetching because:
- Faster (no network request needed)
- Uses already-validated data
- Works offline
- Reduces load on service app servers

## Error Handling

All components use consistent error handling:

- **Network Errors**: Show user-friendly error messages with error details
- **Validation Errors**: Show specific validation messages
- **Unexpected Errors**: Show generic error message with error details
- **Error Messages**: Include the actual error message for debugging

Error messages are displayed using the `MessageStore` with appropriate severity levels (ERROR, WARNING).

## Limitations

1. **No Workspace Preview**: Users can't preview workspace contents before loading
2. **No Partial Loading**: Workspace loading is all-or-nothing (can't load specific networks)
3. **No Workspace Editing**: Can't edit workspace metadata (name, description) after creation
4. **No Workspace Sharing**: Can't share workspaces with other users directly from UI
5. **No Workspace Search**: Can't search or filter workspaces in the list

## Future Enhancements

Potential improvements:

- Workspace preview before loading
- Partial workspace loading (select specific networks)
- Workspace metadata editing
- Workspace sharing functionality
- Workspace search and filtering
- Workspace tags/categories
- Workspace versioning
- Workspace export/import as files
- Batch workspace operations

## Integration

- **Used in**: `DataMenu` component
- **Depends on**: NDEx API, `useLoadWorkspace` hook, `useSaveWorkspaceToNDEx` hook, Keycloak authentication, various stores (AppStore, WorkspaceStore, MessageStore, CredentialStore)

## Related Files

- `LoadWorkspaceMenuItem.tsx` - Menu item for loading workspace
- `LoadWorkspaceDialog.tsx` - Dialog for workspace selection and loading
- `SaveWorkspaceToNDEx.tsx` - Menu item for saving workspace as new
- `SaveWorkspaceToNDExOverwrite.tsx` - Menu item for overwriting workspace
- `WorkspaceNamingDialog.tsx` - Dialog for workspace naming
- `useLoadWorkspace.ts` - Hook for loading workspace
- `useSaveWorkspaceToNDEx.ts` - Hook for saving workspace
