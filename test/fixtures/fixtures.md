# Test Fixtures

This directory contains test resources for Cytoscape Web testing.

## Directory Structure

- `cx2/` - CX2 network files
- `hcx/` - HCX (Hierarchical Cell eXchange) files
- `sif/` - SIF (Simple Interaction Format) files
- `tables/` - CSV, TSV, TXT table files
- `ndex/` - NDEx network documentation
- `urls/` - URL test cases
- `db-snapshots/` - Database snapshot files
- `service-apps/` - Service app definitions and results
- `workspaces/` - Workspace configuration files
- `app-state/` - Application state export files

## Naming Convention

Files use the pattern: `<characteristic>.<valid|invalid>.<ext>`

Examples:

- `minimal.valid.cx2` - Minimal valid CX2 file
- `missing-cxversion.invalid.cx2` - Invalid CX2 missing version
- `csv-with-headers.valid.csv` - Valid CSV with headers
- `inconsistent-columns.invalid.csv` - Invalid CSV with inconsistent columns

## Usage

```typescript
// In tests
import { readFileSync } from 'fs'
const network = readFileSync('test/fixtures/cx2/minimal.valid.cx2', 'utf-8')
```
