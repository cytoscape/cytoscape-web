# Comparison: indexeddb-export-import vs Our Implementation

This document compares the [indexeddb-export-import](https://github.com/Polarisation/indexeddb-export-import) library with our custom database snapshot implementation.

## Overview

| Feature | indexeddb-export-import | Our Implementation |
|---------|------------------------|-------------------|
| **Library** | External npm package | Custom implementation |
| **API Style** | Callback-based | Promise-based (async/await) |
| **Data Format** | Simple object | Structured with metadata |
| **Validation** | None | Comprehensive |
| **Security** | None | Sanitization & validation |
| **Merge Options** | No (always adds) | Yes (merge/skipConflicts) |
| **Selective Import** | No | Yes (objectStores option) |
| **Error Reporting** | Basic | Detailed with counts |

## Code Comparison

### Export Implementation

#### indexeddb-export-import Library
```javascript
function exportToJsonString(idbDatabase, cb) {
  const exportObject = {};
  const objectStoreNamesSet = new Set(idbDatabase.objectStoreNames);
  const objectStoreNames = Array.from(objectStoreNamesSet);
  const transaction = idbDatabase.transaction(objectStoreNames, 'readonly');
  
  objectStoreNames.forEach((storeName) => {
    const allObjects = [];
    transaction.objectStore(storeName).openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        allObjects.push(cursor.value);
        cursor.continue();
      } else {
        exportObject[storeName] = allObjects;
        // Callback when all stores are done
      }
    };
  });
}
```

**Characteristics:**
- Uses cursor-based iteration
- Callback-based API
- No metadata
- Simple object structure
- No error handling for individual stores

#### Our Implementation
```typescript
export const exportDatabaseSnapshot = async (): Promise<string> => {
  const db = await getDb()
  const currentVersion = getDatabaseVersion()
  const appVersion = packageJson.version || '1.0.0'

  const metadata: DatabaseExportMetadata = {
    version: currentVersion,
    exportDate: new Date().toISOString(),
    exportVersion: appVersion,
  }

  const snapshot: DatabaseSnapshot = {
    metadata,
    data: {
      [ObjectStoreNames.Workspace]: await db.workspace.toArray(),
      [ObjectStoreNames.Summaries]: await db.summaries.toArray(),
      // ... all stores using Dexie's toArray()
    },
  }

  return JSON.stringify(snapshot, null, 2)
}
```

**Characteristics:**
- Uses Dexie's `.toArray()` (simpler, Promise-based)
- Promise-based API (async/await)
- Includes metadata (version, date, app version)
- Structured format with validation
- Error handling with try/catch

### Import Implementation

#### indexeddb-export-import Library
```javascript
function importFromJsonString(idbDatabase, jsonString, cb) {
  const importObject = JSON.parse(jsonString);
  const transaction = idbDatabase.transaction(objectStoreNames, 'readwrite');
  
  objectStoreNames.forEach((storeName) => {
    (importObject[storeName] || []).forEach((toAdd) => {
      const request = transaction.objectStore(storeName).add(toAdd);
      request.onsuccess = () => { /* count */ };
      request.onerror = (event) => { console.log(event); };
    });
  });
}
```

**Characteristics:**
- Uses `.add()` which **fails on conflicts**
- No merge options
- No conflict handling
- No validation
- No sanitization
- Basic error logging only

#### Our Implementation
```typescript
export const importDatabaseSnapshot = async (
  snapshotJson: string,
  options: ImportOptions = {},
): Promise<ImportResult> => {
  // 1. Parse and validate size
  if (snapshotJson.length > MAX_SNAPSHOT_SIZE_BYTES) {
    throw new Error('Size limit exceeded');
  }

  // 2. Parse JSON
  const snapshot = JSON.parse(snapshotJson);

  // 3. Comprehensive validation
  const validation = validateSnapshotStructure(snapshot, currentVersion);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errorMessage}`);
  }

  // 4. Import with options
  for (const storeName of storesToImport) {
    await db.transaction('rw', db[storeName], async () => {
      for (const record of records) {
        // Sanitize record
        const sanitizedRecord = sanitizeRecord(record);
        
        if (merge && skipConflicts) {
          // Check if exists, skip if found
          const existing = await db[storeName].get(sanitizedRecord[key]);
          if (existing) { skipped++; continue; }
        }
        
        // Use .put() which handles conflicts
        await db[storeName].put(sanitizedRecord);
        imported++;
      }
    });
  }

  return { success, importedCounts, skippedCounts, errors };
}
```

**Characteristics:**
- Uses `.put()` which **handles conflicts** (overwrites or merges)
- Multiple merge options (merge, skipConflicts)
- Comprehensive validation before import
- Security sanitization (prototype pollution prevention)
- Detailed error reporting with counts
- Selective import (can import specific stores)

## Key Differences

### 1. **API Design**

**Library:**
- Callback-based (older style)
- Requires manual callback management
- No Promise support

**Ours:**
- Promise-based (modern async/await)
- Type-safe with TypeScript
- Better error handling

### 2. **Data Structure**

**Library:**
```json
{
  "workspace": [...],
  "cyNetworks": [...]
}
```

**Ours:**
```json
{
  "metadata": {
    "version": 7,
    "exportDate": "2025-01-15T...",
    "exportVersion": "1.0.4"
  },
  "data": {
    "workspace": [...],
    "cyNetworks": [...]
  }
}
```

### 3. **Conflict Handling**

**Library:**
- Uses `.add()` - **fails on duplicate keys**
- No merge options
- No way to handle conflicts gracefully

**Ours:**
- Uses `.put()` - **overwrites or merges**
- `merge: false` - Replace existing data
- `merge: true, skipConflicts: true` - Skip existing records
- Detailed conflict reporting

### 4. **Security**

**Library:**
- No validation
- No sanitization
- No size limits
- Vulnerable to prototype pollution

**Ours:**
- Comprehensive validation (structure, version, types)
- Security sanitization (removes `__proto__`, `constructor`, `prototype`)
- Size limits (100MB max)
- Depth limits (10 levels)
- Record limits (1M per store)
- Circular reference detection

### 5. **Error Handling**

**Library:**
- Basic error callbacks
- No detailed error reporting
- No statistics

**Ours:**
- Detailed error messages
- Import statistics (importedCounts, skippedCounts)
- Per-record error tracking
- Validation warnings

### 6. **Features**

**Library:**
- Basic export/import
- Clear database function

**Ours:**
- Export with metadata
- Import with merge options
- Selective import (specific stores)
- File validation
- Comprehensive testing
- TypeScript types

## When to Use Each

### Use indexeddb-export-import if:
- ✅ You need a simple, lightweight solution
- ✅ You don't need validation or security
- ✅ You're okay with callback-based APIs
- ✅ Conflicts are not a concern
- ✅ You want a zero-dependency solution

### Use Our Implementation if:
- ✅ You need security and validation
- ✅ You want modern Promise-based APIs
- ✅ You need merge/conflict handling
- ✅ You want detailed error reporting
- ✅ You need TypeScript support
- ✅ You want metadata tracking
- ✅ You need selective import

## Migration Considerations

If you wanted to switch from the library to our implementation:

### Export Migration
```javascript
// Library format
const exportObject = { workspace: [...], cyNetworks: [...] };

// Our format
const snapshot = {
  metadata: { version: 7, exportDate: '...', exportVersion: '1.0.4' },
  data: { workspace: [...], cyNetworks: [...] }
};
```

### Import Migration
```javascript
// Library - fails on conflicts
importFromJsonString(db, json, (error) => { /* ... */ });

// Ours - handles conflicts
const result = await importDatabaseSnapshot(json, { merge: true, skipConflicts: true });
```

## Performance Comparison

| Operation | Library | Ours |
|-----------|---------|------|
| **Export** | Cursor iteration | Dexie `.toArray()` (similar) |
| **Import** | `.add()` (fails on conflict) | `.put()` (handles conflict) |
| **Validation** | None (faster) | Comprehensive (slower but safer) |
| **Memory** | Lower (no validation) | Higher (validation overhead) |

## Conclusion

Our implementation is **more feature-rich and secure** but **more complex** than the library. The library is simpler but lacks:
- Security features
- Validation
- Conflict handling
- Modern APIs
- TypeScript support

For a production application handling user data, our implementation's security and validation features are essential. The library is better suited for simple use cases where these features aren't needed.

## References

- [indexeddb-export-import GitHub](https://github.com/Polarisation/indexeddb-export-import)
- [Our Implementation](../index.ts)
- [Security Documentation](./security.md)
- [Database Snapshot Documentation](./snapshot.md)

