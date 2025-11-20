# Database Snapshots Collection

This directory contains database snapshots from different app versions for backward compatibility testing.

All database snapshots in this directory were generated using the custom snapshot DB module in the project. This module exports the app's IndexedDB content into a portable JSON format that captures the versioned state of all relevant data.

| App Version | Database Version | File                                      | Export Date | Status       |
| ----------- | ---------------- | ----------------------------------------- | ----------- | ------------ |
| v1.0.0      | 50               | `cyweb-db-snapshot-1.0.0-2025-11-17.json` | 2025-11-17  | ✅ Collected |
| v1.0.1      | 50               | `cyweb-db-snapshot-1.0.1-2025-11-17.json` | 2025-11-17  | ✅ Collected |
| v1.0.2      | 50               | `cyweb-db-snapshot-1.0.2-2025-11-17.json` | 2025-11-17  | ✅ Collected |
| v1.0.3      | 60               | `cyweb-db-snapshot-1.0.3-2025-11-17.json` | 2025-11-17  | ✅ Collected |
| v1.0.4      | 70               | `cyweb-db-snapshot-1.0.4-2025-11-17.json` | 2025-11-17  | ✅ Collected |

## Database Version Evolution

- **v1.0.0 - v1.0.2**: Database version 50
- **v1.0.3**: Database version 60 (migration from 50 → 60)
- **v1.0.4**: Database version 70 (migration from 60 → 70)

## Note on Export Versions

⚠️ **Important**: All snapshots currently show `exportVersion: "1.0.4"` in their metadata. This is because the export script uses the current `package.json` version. The actual app versions are:

- v1.0.0 snapshot was exported from app version 1.0.0
- v1.0.1 snapshot was exported from app version 1.0.1
- v1.0.2 snapshot was exported from app version 1.0.2
- v1.0.3 snapshot was exported from app version 1.0.3
- v1.0.4 snapshot was exported from app version 1.0.4

The database `version` field correctly reflects the schema version at the time of export.

## Test Networks Included

Each snapshot contains data from these 8 test networks:

- `06f859c1-8051-11ef-b4e1-005056ae6f73`
- `2496d8c5-5c74-11ec-b3be-0ac135e8bacf`
- `88521140-6a12-11ef-b816-005056ae6f73`
- `a5bf5dc8-8ffb-11ef-b136-005056ae6f73`
- `a9763574-c72f-11ed-a79c-005056ae23aa`
- `1366ba85-9acc-11ef-9702-005056ae6f73`
- `cfb7d52e-a2f2-11ed-9a1f-005056ae23aa`
- `d3030388-dcb7-11ee-867c-005056aecf54`

## Usage

These snapshots can be used to:

1. Test backward compatibility - import old snapshots into current app
2. Verify migrations work correctly
3. Test data integrity after migration
4. Debug issues with old database formats

## Next Steps

1. Create test script to import each snapshot and verify migrations
2. Test that current app can read all old snapshots
3. Verify data integrity after import
4. Document any migration issues or edge cases
