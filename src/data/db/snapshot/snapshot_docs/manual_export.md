# Manual Database Snapshot Export Guide

This guide explains how to manually export a database snapshot from previous versions of the app using browser DevTools. This is useful for:

- Capturing snapshots from older app versions
- Testing migration scenarios
- Creating test data from production environments
- Recovering data when the export feature isn't available

## Method 0: Using Built-in Debug Function (Recommended)

If debug mode is enabled (`config.debug = true`), you can use the built-in export function directly from the browser console:

```javascript
// Export with default app version (from package.json)
await window.debug.exportSnapshot()

// Or specify a custom version
await window.debug.exportSnapshot('1.0.4')
```

This function:

- Automatically discovers the database version and all object stores
- Exports all data to a properly formatted snapshot
- Downloads the file automatically
- Provides detailed console output

**Note**: This function is only available when `config.debug` is `true`. For production builds or when debug mode is disabled, use Method 1 below.

## Method 1: Using Browser DevTools Console

### Step 1: Open DevTools

1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
3. In the left sidebar, expand **IndexedDB**
4. Find and click on `cyweb-db`

### Step 2: Export Using Console Script

Open the **Console** tab and paste this script:

```javascript
// Manual Database Snapshot Export Script
// Run this in the browser console on a page with the app loaded

;(async function exportDatabaseSnapshot() {
  try {
    const dbName = 'cyweb-db'

    // ============================================================================
    // DYNAMICALLY GET DATABASE VERSION AND OBJECT STORE NAMES
    // ============================================================================

    // First, open the database to get its current version and object stores
    const dbInfo = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName)
      request.onsuccess = () => {
        const db = request.result
        const version = db.version
        const objectStoreNames = Array.from(db.objectStoreNames)
        db.close()
        resolve({ version, objectStoreNames })
      }
      request.onerror = () => reject(request.error)
    })

    const dbVersion = dbInfo.version
    const objectStoreNames = dbInfo.objectStoreNames

    console.log(`📦 Database: ${dbName}`)
    console.log(`🔢 Version: ${dbVersion}`)
    console.log(`📋 Object Stores: ${objectStoreNames.join(', ')}`)

    // Open the database for export
    const request = indexedDB.open(dbName, dbVersion)

    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Get current date and app version (you may need to update this)
    const exportDate = new Date().toISOString()
    const exportVersion = '1.0.4' // Update to match the app version you're exporting from

    // Export all object stores
    const data = {}
    for (const storeName of objectStoreNames) {
      try {
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const allRecords = await new Promise((resolve, reject) => {
          const request = store.getAll()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        data[storeName] = allRecords
        console.log(`Exported ${allRecords.length} records from ${storeName}`)
      } catch (error) {
        console.warn(`Failed to export ${storeName}:`, error)
        data[storeName] = []
      }
    }

    // Create snapshot structure
    const snapshot = {
      metadata: {
        version: dbVersion,
        exportDate: exportDate,
        exportVersion: exportVersion,
      },
      data: data,
    }

    // Convert to JSON and download
    const json = JSON.stringify(snapshot, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cyweb-db-snapshot-${exportVersion}-${exportDate.split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log('✅ Snapshot exported successfully!')
    console.log(
      `📊 Total records:`,
      Object.values(data).reduce((sum, arr) => sum + arr.length, 0),
    )

    db.close()
  } catch (error) {
    console.error('❌ Export failed:', error)
  }
})()
```

### Step 3: Verify the Export

1. Check your Downloads folder for the JSON file
2. Open it and verify it has the correct structure:
   - `metadata` object with `version`, `exportDate`, `exportVersion`
   - `data` object with all object store names as keys

## Method 2: Using Application Tab (Chrome/Edge)

### Step 1: Access IndexedDB

1. Open DevTools → **Application** tab
2. Expand **IndexedDB** → `cyweb-db`
3. You'll see all object stores listed

### Step 2: Manual Export (Limited)

Unfortunately, Chrome DevTools doesn't provide a direct "Export All" feature, but you can:

1. Click on each object store to view its data
2. Manually copy data (not practical for large datasets)
3. Use the console script above instead

## Method 3: Using Firefox DevTools

### Step 1: Access Storage

1. Open DevTools → **Storage** tab
2. Expand **IndexedDB** → `cyweb-db`
3. Click on object stores to view data

### Step 2: Export

Firefox also doesn't have a direct export, so use the console script from Method 1.

## Getting Database Version and Object Store Names

If you need to programmatically get the database version and all object store names for a given database name, you can use this code:

```javascript
// Get database version and object store names
async function getDbInfo(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName)
    request.onsuccess = () => {
      const db = request.result
      const version = db.version
      const objectStoreNames = Array.from(db.objectStoreNames)
      db.close()
      resolve({ version, objectStoreNames })
    }
    request.onerror = () => reject(request.error)
  })
}

// Usage:
const dbName = 'cyweb-db'
getDbInfo(dbName).then((info) => {
  console.log('Database Version:', info.version)
  console.log('Object Store Names:', info.objectStoreNames)
  // Output example:
  // Database Version: 7
  // Object Store Names: ['workspace', 'summaries', 'cyNetworks', ...]
})
```

**Key points:**

- `db.version` - Returns the current version number of the database
- `db.objectStoreNames` - Returns a `DOMStringList` of all object store names (convert to array with `Array.from()`)
- Opening the database without specifying a version will open it at its current version
- Always close the database connection after getting the info

## Method 4: Using a Browser Extension

### Recommended Extend: "IndexedDB Browser" or "IndexedDB Explorer"

1. Install a browser extension that can export IndexedDB
2. Navigate to the app
3. Use the extension to export the database
4. **Note**: You may need to manually format the export to match the snapshot structure

## Finding Database Version

To determine the database version:

```javascript
// Run in console
const request = indexedDB.open('cyweb-db')
request.onsuccess = () => {
  const db = request.result
  console.log('Database version:', db.version)
  db.close()
}
```

Or check in DevTools:

- **Application** tab → **IndexedDB** → `cyweb-db` → The version is shown in the database name

## Finding App Version

Check the app version in one of these ways:

1. **Package.json**: If you have access to the source code
2. **App UI**: Some apps display version in About/Help menu
3. **Console**: Run `window.location` and check for version in URL or check app globals
4. **Network Tab**: Check API responses or headers for version info

## Formatting Exported Data

If you export using a browser extension or manual method, you may need to format it to match the snapshot structure:

```javascript
// Format exported data to snapshot structure
const formattedSnapshot = {
  metadata: {
    version: 7, // Your database version
    exportDate: new Date().toISOString(),
    exportVersion: '1.0.4' // Your app version
  },
  data: {
    workspace: [...], // Your exported data
    summaries: [...],
    // ... etc
  }
};

// Then save as JSON file
```

## Troubleshooting

### Issue: "Database is locked"

**Solution**: Close all tabs with the app open, then try again.

### Issue: "Object store not found"

**Solution**: Update the `objectStoreNames` array in the script to match your database version.

### Issue: "Version mismatch"

**Solution**: Update the `dbVersion` variable in the script to match your database version.

### Issue: Export is empty

**Solution**:

- Make sure the app has data loaded
- Check that you're on the correct domain/origin
- Verify IndexedDB is enabled in browser settings

## Testing the Exported Snapshot

After exporting, test the snapshot:

1. Use the app's import feature to import the snapshot
2. Verify all data is restored correctly
3. Check that the app functions normally with the imported data

## Notes

- **Browser Compatibility**: The console script works in Chrome, Edge, Firefox, and Safari
- **Data Size**: Large databases may take time to export
- **Security**: Only export from trusted sources
- **Version Compatibility**: Snapshots from newer versions may not work with older app versions

## Example: Exporting from Version 1.0.3

```javascript
// Update these values for version 1.0.3
const dbVersion = 6 // Check what version 1.0.3 used
const exportVersion = '1.0.3'
const objectStoreNames = [
  // May have different stores in older versions
  'workspace',
  'summaries',
  'cyNetworks',
  // ... etc
]
```

## Related Documentation

- [Database Snapshot Documentation](./snapshot.md)
- [Security Documentation](./security.md)
- [Metadata Documentation](./metadata.md)
