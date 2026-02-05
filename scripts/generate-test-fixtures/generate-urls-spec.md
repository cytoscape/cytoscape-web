# URL Test Fixture Generator Specification

## Overview

Script to programmatically generate URL test cases for Cytoscape Web routing and state management testing.

## Goals

1. Generate URLs with network IDs
2. Generate URLs with import parameters
3. Generate URLs with query parameters (selection, filters, UI state)
4. Generate invalid URLs for error testing
5. Ensure generated URLs follow the naming convention: `<characteristic>.<valid|invalid>.txt`

---

## URL Generator Script

### Script Name
`generate-urls.ts` or `generate-urls.js`

### Command Line Interface

```bash
# Generate URL with network ID
npm run generate:urls -- --type network-id --network-id abc-123 --workspace-id ws-456 --output test/fixtures/urls/network-id-valid.txt

# Generate URL with import parameter
npm run generate:urls -- --type import --import-url https://example.com/network.cx2 --output test/fixtures/urls/import-parameter-valid.txt

# Generate URL with query parameters
npm run generate:urls -- --type query --network-id abc-123 --selected-nodes "n1 n2 n3" --output test/fixtures/urls/state-selected-nodes.txt

# Generate invalid URL
npm run generate:urls -- --type invalid --error invalid-workspace-id --output test/fixtures/urls/invalid-workspace-id.txt
```

### Parameters

#### Required
- `--type` or `-t`: Type of URL to generate
  - `network-id` - URL with network ID in path
  - `import` - URL with import query parameter
  - `query` - URL with state query parameters
  - `combined` - URL with network ID and query parameters
  - `invalid` - Invalid URL (requires `--error`)

#### Optional (Network ID)
- `--workspace-id` or `-w`: Workspace ID (default: `workspace-123`)
- `--network-id` or `-n`: Network ID (default: `network-456`)

#### Optional (Import)
- `--import-url`: URL to import network from (required for `import` type)
- `--multiple-imports`: Multiple import URLs (comma-separated)

#### Optional (Query Parameters)
- `--selected-nodes`: Space-separated list of node IDs
- `--selected-edges`: Space-separated list of edge IDs
- `--filter-for`: Filter target (`node` or `edge`)
- `--filter-by`: Filter attribute name
- `--filter-range`: Filter value range
- `--left-panel`: Panel state (`open` or `closed`)
- `--right-panel`: Panel state (`open` or `closed`)
- `--bottom-panel`: Panel state (`open` or `closed`)
- `--active-network-view`: Active network view ID
- `--active-network-view-tab`: Network view tab index (number)
- `--active-table-browser-tab`: Table browser tab index (number)

#### Optional (Invalid URLs)
- `--error`: Error type for invalid URLs (required if `--type invalid`)
  - `invalid-workspace-id` - Malformed workspace ID
  - `invalid-network-id` - Malformed network ID
  - `invalid-query-params` - Malformed query parameters
  - `invalid-import-url` - Invalid import URL format

#### General
- `--output` or `-o`: Output file path
- `--base-url`: Base URL (default: `/` or empty for relative URLs)

### URL Patterns

#### Network ID URL
```
/:workspaceId/networks/:networkId
```

Example:
```
/workspace-123/networks/a9763574-c72f-11ed-a79c-005056ae23aa
```

#### Import Parameter URL
```
/:workspaceId?import=<url>
```

Example:
```
/?import=https://example.com/network.cx2
```

Multiple imports:
```
/?import=https://example.com/net1.cx2&import=https://example.com/net2.cx2
```

#### Query Parameters URL
```
/:workspaceId/networks/:networkId?<params>
```

Query Parameters:
- `selectedNodes`: Space-separated node IDs
- `selectedEdges`: Space-separated edge IDs
- `filterFor`: `node` or `edge`
- `filterBy`: Attribute name
- `filterRange`: Filter value range
- `left`: `open` or `closed`
- `right`: `open` or `closed`
- `bottom`: `open` or `closed`
- `activeNetworkView`: View ID
- `activeNetworkViewTab`: Network view tab index (number)
- `activeTableBrowserTab`: Table browser tab index (number)

Example:
```
/workspace-123/networks/net-456?selectedNodes=n1 n2 n3&selectedEdges=e1&filterFor=node&filterBy=type&left=open&right=closed
```

#### Combined URL
Network ID + Import + Query Parameters:
```
/:workspaceId/networks/:networkId?import=<url>&<query-params>
```

### Generator Functions

#### `generateNetworkIdURL(options)`
- Creates URL with network ID
- Parameters:
  - `workspaceId`: string
  - `networkId`: string
  - `baseUrl`: string (optional)

#### `generateImportURL(options)`
- Creates URL with import parameter
- Parameters:
  - `workspaceId`: string (optional)
  - `importUrl`: string or string[]
  - `baseUrl`: string (optional)

#### `generateQueryParamsURL(options)`
- Creates URL with query parameters
- Parameters:
  - `workspaceId`: string
  - `networkId`: string
  - `selectedNodes`: string[] (optional)
  - `selectedEdges`: string[] (optional)
  - `filterFor`: string (optional)
  - `filterBy`: string (optional)
  - `filterRange`: string (optional)
  - `leftPanel`: string (optional)
  - `rightPanel`: string (optional)
  - `bottomPanel`: string (optional)
  - `activeNetworkView`: string (optional)
  - `activeNetworkViewTab`: number (optional)
  - `activeTableBrowserTab`: number (optional)
  - `baseUrl`: string (optional)

#### `generateInvalidURL(errorType, baseURL?)`
- Creates an invalid URL
- Parameters:
  - `errorType`: error type
  - `baseURL`: optional base URL to corrupt

### Examples

#### Valid URLs

**Network ID:**
```
/workspace-123/networks/a9763574-c72f-11ed-a79c-005056ae23aa
```

**Import Parameter:**
```
/?import=https://dev1.ndexbio.org/v3/network/a9763574-c72f-11ed-a79c-005056ae23aa/cx2
```

**Selected Nodes:**
```
/workspace-123/networks/net-456?selectedNodes=node1 node2 node3
```

**Complete State:**
```
/workspace-123/networks/net-456?selectedNodes=n1 n2&selectedEdges=e1&filterFor=node&filterBy=type&filterRange=protein&left=open&right=closed&activeNetworkView=view-1&activeNetworkViewTab=1&activeTableBrowserTab=1
```

#### Invalid URLs

**Invalid Workspace ID:**
```
/invalid-workspace-123/networks/net-456
```

**Invalid Network ID:**
```
/workspace-123/networks/not-a-valid-uuid
```

**Malformed Query Parameters:**
```
/workspace-123/networks/net-456?invalid=param&format
```

---

## Usage Examples

### Generate basic network ID URLs

```bash
# Valid network ID
npm run generate:urls -- --type network-id --network-id abc-123 --workspace-id ws-456 --output test/fixtures/urls/network-id-valid.txt

# Network ID that needs import
npm run generate:urls -- --type network-id --network-id new-uuid --workspace-id ws-456 --output test/fixtures/urls/network-id-import.txt
```

### Generate import URLs

```bash
# Single import
npm run generate:urls -- --type import --import-url https://example.com/network.cx2 --output test/fixtures/urls/import-parameter-valid.txt

# Multiple imports
npm run generate:urls -- --type import --multiple-imports "https://example.com/net1.cx2,https://example.com/net2.cx2" --output test/fixtures/urls/import-parameter-multiple.txt

# Invalid import URL
npm run generate:urls -- --type invalid --error invalid-import-url --output test/fixtures/urls/import-parameter-invalid-url.txt
```

### Generate query parameter URLs

```bash
# Selected nodes
npm run generate:urls -- --type query --selected-nodes "n1 n2 n3" --output test/fixtures/urls/state-selected-nodes.txt

# Selected edges
npm run generate:urls -- --type query --selected-edges "e1 e2" --output test/fixtures/urls/state-selected-edges.txt

# Filter state
npm run generate:urls -- --type query --filter-for node --filter-by type --filter-range protein --output test/fixtures/urls/state-filter.txt

# Panel states
npm run generate:urls -- --type query --left-panel open --right-panel closed --bottom-panel open --output test/fixtures/urls/state-panels.txt

# Complete state
npm run generate:urls -- --type combined --selected-nodes "n1 n2" --selected-edges "e1" --filter-for node --filter-by type --left-panel open --right-panel closed --active-network-view view-1 --active-network-view-tab 1 --active-table-browser-tab 1 --output test/fixtures/urls/state-complete.txt
```

### Generate invalid URLs

```bash
# Invalid workspace ID
npm run generate:urls -- --type invalid --error invalid-workspace-id --output test/fixtures/urls/invalid-workspace-id.txt

# Invalid network ID
npm run generate:urls -- --type invalid --error invalid-network-id --output test/fixtures/urls/invalid-network-id.txt

# Invalid query parameters
npm run generate:urls -- --type invalid --error invalid-query-params --output test/fixtures/urls/invalid-query-params.txt
```

---

## Output Format

Each URL should be written as a single line in a text file. Multiple URLs can be in the same file (one per line) if generating a batch.

Example file content:
```
/workspace-123/networks/a9763574-c72f-11ed-a79c-005056ae23aa
/workspace-123/networks/net-456?selectedNodes=n1 n2 n3
/?import=https://example.com/network.cx2
```

---

## Future Enhancements

1. **Batch generation**: Generate multiple URL variations at once
2. **URL encoding**: Handle URL encoding/decoding automatically
3. **Validation**: Validate generated URLs against routing spec
4. **Template system**: Use templates for complex URL patterns
5. **Real network IDs**: Use actual network IDs from fixtures

