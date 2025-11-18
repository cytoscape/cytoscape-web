# Application State Export Documentation

## Overview

The application state export functionality allows you to export the complete application state, including both IndexedDB data and in-memory Zustand store states. This is useful for:

- Understanding the application state structure from a high-level view
- Improving state/model design and organization
- Debugging state-related issues
- Creating reference snapshots of typical application states

## What Gets Exported

The application state export includes:

1. **Database State** (IndexedDB):
2. **Store States** (Zustand in-memory):
3. **Summary Information**:
   - Network count
   - Workspace ID
   - Current network ID
   - List of network IDs
   - Store states count

## Export Format

The exported JSON has the following structure:

```json
{
  "metadata": {
    "version": 7,
    "exportDate": "2025-01-XXT...",
    "exportVersion": "1.0.4",
    "buildId": "abc1234-01-15-2025-10-30-00",
    "buildDate": "2025-01-15T10:30:00Z"
  },
  "database": {
    "workspace": [...],
    "summaries": [...],
    "cyNetworks": [...],
    "cyTables": [...],
    "cyVisualStyles": [...],
    "cyNetworkViews": [...],
    "uiState": [...],
    "timestamp": [...],
    "filters": [...],
    "apps": [...],
    "serviceApps": [...],
    "opaqueAspects": [...],
    "undoStacks": [...]
  },
  "stores": {
    "workspace": { ... },
    "network": { ... },
    "networkSummary": { ... },
    "table": { ... },
    "visualStyle": { ... },
    "viewModel": { ... },
    "uiState": { ... },
    "app": { ... },
    "filter": { ... },
    "layout": { ... },
    "renderer": { ... },
    "rendererFunction": { ... },
    "opaqueAspect": { ... },
    "undo": { ... },
    "message": { ... },
    "credential": { ... }
  },
  "summary": {
    "networkCount": 3,
    "workspaceId": "workspace-123",
    "currentNetworkId": "network-456",
    "networkIds": ["network-456", "network-789", "network-012"],
    "storeStatesCount": 16
  }
}
```

## Usage

### Method 1: Browser Console (Recommended)

When debug mode is enabled, you can use the browser console:

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Navigate to a page with the Cytoscape Web app loaded
4. Run:

```javascript
await window.debug.exportAppState()
```

This will:

- Export the complete application state
- Download it as a JSON file
- Display statistics in the console

### Method 2: Programmatic Usage

You can also use the export functions programmatically:

```typescript
import { exportApplicationState, exportApplicationStateToFile } from './db'

// Export as JSON string
const stateJson = await exportApplicationState()
console.log(stateJson)

// Export and download file
await exportApplicationStateToFile('my-app-state.json')
```

### Method 3: From Code

If you want to create a reference file programmatically:

```typescript
import { exportApplicationState } from './db'
import * as fs from 'fs'

// In a Node.js script or build tool
const stateJson = await exportApplicationState()
fs.writeFileSync('reference-app-state.json', stateJson)
```

## Creating a Reference State File

To create a reference JSON file representing a typical application state:

1. **Load the application** with some typical data:
   - Load a few networks
   - Apply some layouts
   - Configure visual styles
   - Set up filters
   - Make some UI changes

2. **Export the state** using one of the methods above

3. **Save the file** in your project (e.g., `docs/reference-app-state.json`)

4. **Use it as a reference** when:
   - Designing new state structures
   - Understanding state relationships
   - Planning refactoring
   - Documenting state architecture

## Notes

- **Map Serialization**: Zustand stores may contain `Map` objects, which are automatically converted to plain objects for JSON serialization
- **Size Considerations**: Large application states can result in large JSON files. Consider the file size when sharing or storing
- **Privacy**: Application state exports may contain sensitive data. Be careful when sharing these files
- **Version Compatibility**: The export includes version metadata to help track compatibility

## Comparison with Database Snapshot

The application state export is more comprehensive than the database snapshot:

- **Database Snapshot**: Only exports IndexedDB data (persisted state)
- **Application State Export**: Exports both IndexedDB data AND in-memory Zustand store states

Use the application state export when you need to see the complete picture of the application state, including what's currently in memory.

## Troubleshooting

If export fails:

1. **Check console errors**: Look for specific error messages
2. **Verify stores are loaded**: Make sure the application is fully initialized
3. **Check debug mode**: Some functions require debug mode to be enabled
4. **Verify database access**: Ensure IndexedDB is accessible

## Example Use Cases

1. **State Architecture Review**: Export state to understand how different parts of the application interact
2. **Refactoring Planning**: Use exported state to identify redundant or poorly organized state
3. **Documentation**: Include exported state examples in documentation to show typical application states
4. **Testing**: Use exported states as test fixtures or for state restoration testing
5. **Debugging**: Export state when investigating state-related bugs
