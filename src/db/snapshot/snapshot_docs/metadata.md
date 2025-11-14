# Database Snapshot Metadata

This document describes the metadata included in database snapshot exports.

## Metadata Structure

```typescript
interface DatabaseExportMetadata {
  version: number // Database schema version (required)
  exportDate: string // ISO timestamp when export was created (required)
  exportVersion: string // App version from package.json (required)
  buildId?: string // Build ID (git commit hash + commit date) (optional)
  buildDate?: string // Build timestamp (ISO string) (optional)
}
```

## Required Fields

### `version`

- **Type**: `number`
- **Description**: Database schema version (currently 7)
- **Purpose**: Used for validation and migration compatibility checks
- **Example**: `7`

### `exportDate`

- **Type**: `string` (ISO 8601 format)
- **Description**: Timestamp when the snapshot was created
- **Purpose**: Track when the export was made
- **Example**: `"2025-01-15T14:30:00.000Z"`

### `exportVersion`

- **Type**: `string`
- **Description**: Application version from `package.json`
- **Purpose**: Track which app version created the snapshot
- **Example**: `"1.0.4"`

## Optional Fields

### `buildId`

- **Type**: `string` (optional)
- **Description**: Build identifier combining git commit hash and commit date
- **Format**: `{short-commit-hash}-{MM-DD-YYYY-HH-MM-SS}`
- **Purpose**: Track the exact build/commit that created the snapshot
- **Example**: `"abc1234-01-15-2025-14-30-00"`
- **Availability**: Only included if `REACT_APP_GIT_COMMIT` and `REACT_APP_LAST_COMMIT_TIME` environment variables are set during build

### `buildDate`

- **Type**: `string` (ISO 8601 format, optional)
- **Description**: Timestamp when the application was built
- **Purpose**: Track when the build was created
- **Example**: `"2025-01-15T14:30:00.000Z"`
- **Availability**: Only included if `REACT_APP_BUILD_TIME` environment variable is set during build

## Example Snapshot Metadata

### With Build Information (Production Build)

```json
{
  "metadata": {
    "version": 7,
    "exportDate": "2025-01-15T14:30:00.000Z",
    "exportVersion": "1.0.4",
    "buildId": "abc1234-01-15-2025-14-30-00",
    "buildDate": "2025-01-15T14:25:00.000Z"
  },
  "data": { ... }
}
```

### Without Build Information (Development/Manual Export)

```json
{
  "metadata": {
    "version": 7,
    "exportDate": "2025-01-15T14:30:00.000Z",
    "exportVersion": "1.0.4"
  },
  "data": { ... }
}
```

## How Metadata is Generated

### During Export

The metadata is automatically populated in `src/db/snapshot/index.ts`:

```typescript
const metadata: DatabaseExportMetadata = {
  version: currentVersion, // From getDatabaseVersion()
  exportDate: new Date().toISOString(), // Current timestamp
  exportVersion: packageJson.version, // From package.json
  ...(buildId && { buildId }), // If env vars available
  ...(buildDate && { buildDate }), // If env var available
}
```

### Build Information Source

Build information comes from webpack environment variables injected during build:

- **`REACT_APP_GIT_COMMIT`**: Git commit hash (short format)
- **`REACT_APP_LAST_COMMIT_TIME`**: Last commit timestamp
- **`REACT_APP_BUILD_TIME`**: Build timestamp

These are set in `webpack.config.js`:

```javascript
new webpack.DefinePlugin({
  'process.env.REACT_APP_GIT_COMMIT': JSON.stringify(
    execSync('git rev-parse --short HEAD').toString().trim(),
  ),
  'process.env.REACT_APP_LAST_COMMIT_TIME': JSON.stringify(
    execSync('git show -s --format=%cI HEAD').toString().trim(),
  ),
  'process.env.REACT_APP_BUILD_TIME': JSON.stringify(new Date().toISOString()),
})
```

## Use Cases

### Version Tracking

- Identify which app version created the snapshot
- Track database schema version for compatibility

### Debugging

- Match snapshots to specific builds/commits
- Track when exports were created vs when builds were made

### Migration

- Validate snapshot compatibility with current app version
- Warn about version mismatches

### Audit Trail

- Track export history
- Identify source of snapshots

## Validation

The metadata is validated during import:

1. **Required fields**: `version`, `exportDate`, `exportVersion` must be present and valid
2. **Optional fields**: `buildId` and `buildDate` are validated if present
3. **Version compatibility**: Snapshot version is checked against current database version
4. **Date validation**: All date fields must be valid ISO 8601 strings

See `src/db/snapshot/snapshotValidator.ts` for validation logic.

## Manual Export

When exporting manually using browser DevTools, you may not have build information available. The snapshot will still be valid with just the required fields:

```json
{
  "metadata": {
    "version": 7,
    "exportDate": "2025-01-15T14:30:00.000Z",
    "exportVersion": "1.0.4"
  },
  "data": { ... }
}
```

## Related Documentation

- [Database Snapshot Documentation](./snapshot.md)
- [Manual Snapshot Export Guide](./manual_export.md)
- [Security Documentation](./security.md)
