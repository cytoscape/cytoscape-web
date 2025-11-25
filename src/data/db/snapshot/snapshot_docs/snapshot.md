# Database Snapshot Documentation

## Overview

The database snapshot functionality allows users to create snapshots and restore the entire IndexedDB database, including all networks, tables, visual styles, views, and application state.

## Features

- **Full Database Export**: Exports all object stores as a single JSON file
- **Version Tracking**: Includes database schema version and app version in exports
- **Comprehensive Validation**: Validates snapshot structure, size, and content before import
- **Security**: Sanitizes imported data to prevent security vulnerabilities
- **Error Handling**: Detailed error reporting and partial import support

## Export

### Function: `exportDatabaseSnapshot()`

Exports the entire database as a JSON string.

```typescript
const snapshotJson = await exportDatabaseSnapshot()
```

**Returns**: `Promise<string>` - JSON string containing the database snapshot

**Export Format**:

```json
{
  "metadata": {
    "version": 7,
    "exportDate": "2025-01-XXT...",
    "exportVersion": "1.0.4"
  },
  "data": {
    "workspace": [...],
    "cyNetworks": [...],
    "cyTables": [...],
    // ... all object stores
  }
}
```

### Function: `exportDatabaseSnapshotToFile(filename?)`

Exports the database and triggers a browser download.

```typescript
await exportDatabaseSnapshotToFile() // Uses default filename
await exportDatabaseSnapshotToFile('my-snapshot.json') // Custom filename
```

**Default Filename Format**: `cyweb-db-snapshot-{version}-{date}.json`

- Example: `cyweb-db-snapshot-1.0.4-2025-01-15.json`

## Import

### Function: `importDatabaseSnapshot(snapshotJson, options?)`

Imports a database snapshot from a JSON string.

```typescript
const result = await importDatabaseSnapshot(snapshotJson, {
  merge: false, // Replace existing data (default)
  skipConflicts: false, // Skip existing records when merge=true
  objectStores: undefined, // Import all stores (default)
})
```

**Parameters**:

- `snapshotJson`: `string` - JSON string containing the database snapshot
- `options`: `ImportOptions` (optional)
  - `merge`: `boolean` - If true, merge with existing data; if false, replace (default: false)
  - `skipConflicts`: `boolean` - Skip records that already exist (only when merge=true, default: false)
  - `objectStores`: `ObjectStoreNames[]` - Specific stores to import (default: all)

**Returns**: `Promise<ImportResult>`

```typescript
interface ImportResult {
  success: boolean
  importedCounts: Record<ObjectStoreNames, number>
  skippedCounts?: Record<ObjectStoreNames, number>
  errors?: string[]
}
```

### Function: `importDatabaseSnapshotFromFile(file, options?)`

Imports a database snapshot from a File object.

**⚠️ Important**: This function will **clear all existing workspaces** in IndexedDB before importing the snapshot. All workspace data will be replaced with the imported snapshot data.

```typescript
const file = event.target.files[0]
const result = await importDatabaseSnapshotFromFile(file, {
  merge: false,
})
```

**Parameters**:

- `file`: `File` - File object containing the JSON snapshot
- `options`: `ImportOptions` (optional) - Same as `importDatabaseSnapshot`

**Returns**: `Promise<ImportResult>`

**Note**: Before importing, all workspaces in IndexedDB are automatically cleared to ensure a clean import state.

## Validation

### Pre-Import Validation

Before importing, the snapshot is validated for:

1. **File Validation**:
   - File size (max 100MB)
   - File extension (.json)
   - MIME type

2. **Structure Validation**:
   - Valid JSON format
   - Required metadata fields (version field is included but not validated)
   - Valid object store names
   - Array types for object store data
   - Record count limits (max 1M per store)
   - Object depth limits (max 10 levels)

3. **Security Validation**:
   - Prototype pollution prevention
   - Dangerous key detection
   - Circular reference detection

### Validation Errors

If validation fails, the import is rejected with detailed error messages:

```typescript
try {
  await importDatabaseSnapshot(snapshotJson)
} catch (error) {
  console.error('Import failed:', error.message)
  // Error messages are user-friendly and specific
}
```

## Security

### Sanitization

All imported records are automatically sanitized to prevent:

- **Prototype Pollution**: Removes `__proto__`, `constructor`, `prototype` keys
- **Code Injection**: Validates all object properties
- **Circular References**: Detects and prevents infinite loops

### Limits

- **File Size**: Maximum 100MB
- **Records per Store**: Maximum 1,000,000
- **Object Depth**: Maximum 10 levels

See [Security Documentation](./security.md) for detailed security information.

## Usage Examples

### Basic Export

```typescript
import { exportDatabaseSnapshotToFile } from './db'

// Export and download
await exportDatabaseSnapshotToFile()
```

### Basic Import

```typescript
import { importDatabaseSnapshotFromFile } from './db'

// Import from file
const file = event.target.files[0]
const result = await importDatabaseSnapshotFromFile(file)

if (result.success) {
  console.log('Import successful!')
  console.log('Imported:', result.importedCounts)
} else {
  console.error('Import errors:', result.errors)
}
```

### Merge Import

```typescript
// Import and merge with existing data, skipping conflicts
const result = await importDatabaseSnapshot(snapshotJson, {
  merge: true,
  skipConflicts: true,
})
```

### Selective Import

```typescript
import { ObjectStoreNames } from './db'

// Import only specific stores
const result = await importDatabaseSnapshot(snapshotJson, {
  objectStores: [ObjectStoreNames.CyNetworks, ObjectStoreNames.CyTables],
})
```

## Error Handling

### Validation Errors

```typescript
try {
  await importDatabaseSnapshot(invalidSnapshot)
} catch (error) {
  // Validation failed before import
  if (error.message.includes('validation failed')) {
    // Handle validation error
  }
}
```

### Import Errors

```typescript
const result = await importDatabaseSnapshot(snapshotJson)

if (!result.success) {
  // Some records failed to import
  console.error('Errors:', result.errors)
  console.log('Partially imported:', result.importedCounts)
}
```

## Best Practices

1. **Always validate**: The import function validates automatically, but you can pre-validate if needed
2. **Export first**: Export your database before importing
3. **Check results**: Always check the `ImportResult` for errors
4. **Handle warnings**: Review validation warnings for potential issues
5. **Use transactions**: Import uses transactions automatically for safety

## Limitations

1. **Size Limits**: Files larger than 100MB are rejected
2. **Data Replacement**: Importing from file clears all existing workspaces in IndexedDB
3. **Browser Storage**: Limited by browser's IndexedDB quota
4. **Performance**: Large imports may take time

**Note**: Version validation has been removed. Snapshots with any version number will be accepted during import.

## Troubleshooting

### Import Fails with "Validation Failed"

- Check that the snapshot file is valid JSON
- Verify the snapshot has required `metadata` and `data` fields
- Note: Version compatibility is not checked - any version number is accepted

### Import Partially Succeeds

- Check `result.errors` for specific record failures
- Some records may be invalid while others import successfully
- Review logs for detailed error information

### File Too Large

- Reduce the amount of data in the database before export
- Consider exporting specific object stores only
- The 100MB limit is a security measure and cannot be bypassed

## Testing

See `src/db/snapshot/snapshot.test.ts` for comprehensive test coverage including:

- Export functionality
- Import functionality
- Validation tests
- Security tests
- Error handling tests

## References

- [Metadata Documentation](./metadata.md)
- [Security Documentation](./security.md)
- [Manual Export Guide](./manual_export.md)
- [Implementation Comparison](./snapshot_implementation_comparison.md)
