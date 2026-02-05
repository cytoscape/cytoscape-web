/**
 * Manual Database Snapshot Export Script
 * 
 * Usage:
 * 1. Open your browser's Developer Tools (F12)
 * 2. Go to the Console tab
 * 3. Navigate to a page with the Cytoscape Web app loaded
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter to run
 * 
 * The script will:
 * - Export all IndexedDB data
 * - Format it as a database snapshot
 * - Download it as a JSON file
 */

(async function exportDatabaseSnapshot() {
  try {
    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    
    const dbName = 'cyweb-db';
    const exportVersion = '1.0.4'; // Update to match the app version you're exporting from
    
    console.log('🚀 Starting database snapshot export...');
    console.log(`📦 Database: ${dbName}`);
    
    // ============================================================================
    // DYNAMICALLY GET DATABASE VERSION AND OBJECT STORE NAMES
    // ============================================================================
    
    // First, open the database to get its current version and object stores
    const dbInfo = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        const version = db.version;
        const objectStoreNames = Array.from(db.objectStoreNames);
        db.close();
        resolve({ version, objectStoreNames });
      };
      request.onerror = () => reject(request.error);
    });
    
    const dbVersion = dbInfo.version;
    const objectStoreNames = dbInfo.objectStoreNames;
    
    console.log(`🔢 Database Version: ${dbVersion}`);
    console.log(`📋 Object Stores (${objectStoreNames.length}):`, objectStoreNames.join(', '));
    console.log(`📱 App Version: ${exportVersion}`);
    
    // ============================================================================
    // OPEN DATABASE FOR EXPORT
    // ============================================================================
    
    const request = indexedDB.open(dbName, dbVersion);
    
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('✅ Database opened successfully');
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('❌ Failed to open database:', request.error);
        reject(request.error);
      };
      request.onblocked = () => {
        console.warn('⚠️ Database is blocked. Close other tabs and try again.');
      };
    });
    
    // ============================================================================
    // EXPORT ALL OBJECT STORES
    // ============================================================================
    
    const exportDate = new Date().toISOString();
    const data = {};
    let totalRecords = 0;
    
    console.log('\n📊 Exporting object stores...');
    
    for (const storeName of objectStoreNames) {
      try {
        // Check if store exists
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn(`⚠️ Object store "${storeName}" does not exist, skipping`);
          data[storeName] = [];
          continue;
        }
        
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        const allRecords = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        data[storeName] = allRecords;
        totalRecords += allRecords.length;
        console.log(`  ✓ ${storeName}: ${allRecords.length} records`);
      } catch (error) {
        console.error(`  ✗ Failed to export ${storeName}:`, error);
        data[storeName] = [];
      }
    }
    
    // ============================================================================
    // CREATE SNAPSHOT STRUCTURE
    // ============================================================================
    
    const snapshot = {
      metadata: {
        version: dbVersion,
        exportDate: exportDate,
        exportVersion: exportVersion
      },
      data: data
    };
    
    // ============================================================================
    // VALIDATE SNAPSHOT
    // ============================================================================
    
    console.log('\n🔍 Validating snapshot...');
    
    if (!snapshot.metadata) {
      throw new Error('Missing metadata');
    }
    
    if (!snapshot.data) {
      throw new Error('Missing data');
    }
    
    const snapshotSize = JSON.stringify(snapshot).length;
    const snapshotSizeMB = (snapshotSize / (1024 * 1024)).toFixed(2);
    
    console.log(`  ✓ Metadata: OK`);
    console.log(`  ✓ Data: OK`);
    console.log(`  ✓ Size: ${snapshotSizeMB} MB`);
    console.log(`  ✓ Total records: ${totalRecords}`);
    
    // ============================================================================
    // DOWNLOAD SNAPSHOT
    // ============================================================================
    
    console.log('\n💾 Downloading snapshot...');
    
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = exportDate.split('T')[0]; // YYYY-MM-DD
    link.download = `cyweb-db-snapshot-${exportVersion}-${dateStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // ============================================================================
    // SUMMARY
    // ============================================================================
    
    console.log('\n✅ Snapshot exported successfully!');
    console.log(`📁 Filename: cyweb-db-snapshot-${exportVersion}-${dateStr}.json`);
    console.log(`📊 Total records: ${totalRecords}`);
    console.log(`💾 File size: ${snapshotSizeMB} MB`);
    console.log('\n📋 Snapshot structure:');
    console.log('  - metadata.version:', snapshot.metadata.version);
    console.log('  - metadata.exportDate:', snapshot.metadata.exportDate);
    console.log('  - metadata.exportVersion:', snapshot.metadata.exportVersion);
    console.log('  - data keys:', Object.keys(snapshot.data).join(', '));
    
    db.close();
    
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    console.error('Stack:', error.stack);
    
    if (error.name === 'VersionError') {
      console.error('\n💡 Tip: The database version may have changed.');
      console.error('   Try running this to find the current version:');
      console.error('   indexedDB.open("cyweb-db").onsuccess = (e) => console.log("Version:", e.target.result.version);');
    }
    
    if (error.name === 'InvalidStateError') {
      console.error('\n💡 Tip: The database may be in use. Close other tabs and try again.');
    }
  }
})();

