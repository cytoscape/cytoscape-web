# Test Fixture Generator Specification

## Overview

Scripts to programmatically generate CX2 and HCX test fixtures for Cytoscape Web testing.

## Goals

1. Generate valid CX2 files of various sizes and characteristics
2. Generate invalid CX2 files for error testing
3. Generate HCX files with different configurations
4. Ensure generated files follow the naming convention: `<characteristic>.<valid|invalid>.<ext>`
5. Make it easy to add new test cases

---

## CX2 Generator Script

### Script Name
`generate-cx2.ts` or `generate-cx2.js`

### Command Line Interface

```bash
# Generate a minimal valid CX2
npm run generate:cx2 -- --type minimal --output test/fixtures/cx2/minimal.valid.cx2

# Generate a small network
npm run generate:cx2 -- --type small --nodes 20 --edges 30 --output test/fixtures/cx2/small-network.valid.cx2

# Generate an invalid file
npm run generate:cx2 -- --type invalid --error missing-cxversion --output test/fixtures/cx2/missing-cxversion.invalid.cx2

# Generate with specific characteristics
npm run generate:cx2 -- --type medium --nodes 100 --edges 200 --with-layout --with-visual-style --output test/fixtures/cx2/medium-with-style.valid.cx2
```

### Parameters

#### Required
- `--type` or `-t`: Type of file to generate
  - `minimal` - Smallest valid CX2 (2 nodes, 1 edge)
  - `small` - Small network (10-50 nodes, 20-100 edges)
  - `medium` - Medium network (100-500 nodes, 200-1000 edges)
  - `large` - Large network (1000-10000 nodes, 2000-15000 edges)
  - `invalid` - Invalid CX2 file (requires `--error`)

#### Optional
- `--nodes` or `-n`: Number of nodes (default: based on type)
- `--edges` or `-e`: Number of edges (default: based on type)
- `--output` or `-o`: Output file path (default: based on type and characteristics)
- `--with-layout`: Include CartesianLayout aspect
- `--without-layout`: Explicitly exclude layout (default for some types)
- `--with-visual-style`: Include VisualProperties aspect
- `--without-visual-style`: Explicitly exclude visual style
- `--with-attributes`: Include node/edge attributes
- `--with-opaque-aspects`: Include opaque aspects
- `--with-subnetworks`: Include SubNetworks aspect
- `--error`: Error type for invalid files (required if `--type invalid`)
  - `missing-cxversion` - No CXVersion in first element
  - `wrong-version` - Wrong CX version (not 2.0)
  - `not-array` - Root is object instead of array
  - `empty-array` - Empty array
  - `missing-status` - No status aspect
  - `duplicate-node-ids` - Duplicate node IDs
  - `duplicate-edge-ids` - Duplicate edge IDs
  - `invalid-edge-reference` - Edge references non-existent node
  - `invalid-bypass-reference` - Bypass references invalid entity
  - `attribute-type-mismatch` - Attribute value doesn't match declared type
  - `metadata-mismatch` - Metadata doesn't match actual data
  - `invalid-aspect-structure` - Aspect with wrong structure
  - `invalid-json` - Malformed JSON

### Output Structure

#### Valid CX2 Structure
```json
[
  {
    "CXVersion": "2.0"
  },
  {
    "status": [
      {
        "error": "",
        "success": true
      }
    ]
  },
  {
    "metaData": [
      {
        "name": "nodes",
        "elementCount": <nodeCount>,
        "version": "1.0",
        "idCounter": <maxNodeId>,
        "propertyCounter": 0,
        "consistencyGroup": 1
      },
      {
        "name": "edges",
        "elementCount": <edgeCount>,
        "version": "1.0",
        "idCounter": <maxEdgeId>,
        "propertyCounter": 0,
        "consistencyGroup": 1
      }
    ]
  },
  {
    "nodes": [
      {
        "@id": <id>,
        "n": "<name>",
        // ... more nodes
      }
    ]
  },
  {
    "edges": [
      {
        "@id": <id>,
        "s": <sourceNodeId>,
        "t": <targetNodeId>,
        "i": "<interaction>"
        // ... more edges
      }
    ]
  },
  // Optional aspects:
  {
    "cartesianLayout": [...]
  },
  {
    "visualProperties": [...]
  },
  {
    "nodeAttributes": [...]
  },
  {
    "edgeAttributes": [...]
  },
  {
    "networkAttributes": [...]
  },
  {
    "attributeDeclarations": [...]
  },
  {
    "subNetworks": [...]
  }
]
```

### Generator Functions

#### `generateValidCX2(options)`
- Creates a valid CX2 structure
- Parameters:
  - `nodeCount`: number of nodes
  - `edgeCount`: number of edges
  - `withLayout`: boolean
  - `withVisualStyle`: boolean
  - `withAttributes`: boolean
  - `withOpaqueAspects`: boolean
  - `withSubnetworks`: boolean

#### `generateInvalidCX2(errorType, baseNetwork?)`
- Creates an invalid CX2 based on error type
- Parameters:
  - `errorType`: one of the error types listed above
  - `baseNetwork`: optional valid network to corrupt

### Examples

#### Minimal Valid CX2
```json
[
  {"CXVersion": "2.0"},
  {"status": [{"error": "", "success": true}]},
  {
    "metaData": [
      {"name": "nodes", "elementCount": 2, "version": "1.0", "idCounter": 2, "propertyCounter": 0, "consistencyGroup": 1},
      {"name": "edges", "elementCount": 1, "version": "1.0", "idCounter": 1, "propertyCounter": 0, "consistencyGroup": 1}
    ]
  },
  {
    "nodes": [
      {"@id": 0, "n": "node1"},
      {"@id": 1, "n": "node2"}
    ]
  },
  {
    "edges": [
      {"@id": 0, "s": 0, "t": 1, "i": "interacts"}
    ]
  }
]
```

#### Invalid: Missing CXVersion
```json
[
  {
    "status": [{"error": "", "success": true}]
  }
  // Missing CXVersion
]
```

---

## HCX Generator Script

### Script Name
`generate-hcx.ts` or `generate-hcx.js`

### Command Line Interface

```bash
# Generate HCX with filter configs
npm run generate:hcx -- --type with-filter-configs --output test/fixtures/hcx/with-filter-configs.valid.cx2

# Generate HCX without filter configs
npm run generate:hcx -- --type without-filter-configs --output test/fixtures/hcx/without-filter-configs.valid.cx2

# Generate HCX with interaction UUID
npm run generate:hcx -- --type with-interaction-uuid --interaction-uuid <uuid> --output test/fixtures/hcx/with-interaction-uuid.valid.cx2

# Generate invalid HCX
npm run generate:hcx -- --type invalid --error missing-metadata --output test/fixtures/hcx/missing-metadata.invalid.cx2
```

### Parameters

#### Required
- `--type` or `-t`: Type of HCX file
  - `with-filter-configs` - HCX with filter configurations
  - `without-filter-configs` - HCX without filter configs
  - `with-interaction-uuid` - HCX with interaction network UUID
  - `without-interaction-uuid` - HCX without interaction UUID
  - `fully-compliant` - Fully compliant HCX
  - `with-warnings` - Valid but with warnings
  - `invalid` - Invalid HCX (requires `--error`)

#### Optional
- `--nodes` or `-n`: Number of nodes (default: 50)
- `--edges` or `-e`: Number of edges (default: 100)
- `--output` or `-o`: Output file path
- `--interaction-uuid`: Interaction network UUID (for `with-interaction-uuid`)
- `--interaction-host`: Interaction network host (default: dev1.ndexbio.org)
- `--ndex-schema-version`: HCX schema version (default: latest)
- `--model-file-count`: Number of model files (default: 1)
- `--error`: Error type for invalid files
  - `missing-metadata` - Missing HCX metadata properties
  - `invalid-schema-version` - Wrong schema version
  - `invalid-filter-config` - Malformed filter aspects
  - `not-dag` - Network has cycles (not a DAG)

### HCX Requirements

HCX networks must include specific metadata in `networkAttributes`:

```json
{
  "networkAttributes": [
    {
      "n": "ndex:schema",
      "v": "<schema-version>",  // e.g., "2.0"
      "d": "string"
    },
    {
      "n": "ndex:interactionNetworkUUID",
      "v": "<uuid>",  // Optional
      "d": "string"
    },
    {
      "n": "ndex:interactionNetworkHost",
      "v": "<host>",  // Optional, e.g., "dev1.ndexbio.org"
      "d": "string"
    },
    {
      "n": "ndex:modelFileCount",
      "v": "<count>",  // e.g., "1"
      "d": "string"
    }
  ]
}
```

### Filter Aspects Structure

If `with-filter-configs` is specified, include FilterAspects:

```json
{
  "filterAspects": [
    {
      "filter": [
        {
          "predicate": "<attribute-name>",
          "criterion": "equals",
          "description": "Filter description",
          "tooltip": "Tooltip text"
        }
      ],
      "label": "Filter Label",
      "appliesTo": "node",  // or "edge"
      "attributeName": "<attribute-name>"
    }
  ]
}
```

### Generator Functions

#### `generateValidHCX(options)`
- Creates a valid HCX network
- Parameters:
  - `nodeCount`: number of nodes
  - `edgeCount`: number of edges
  - `withFilterConfigs`: boolean
  - `withInteractionUUID`: boolean
  - `interactionUUID`: string (optional)
  - `interactionHost`: string (optional)
  - `schemaVersion`: string (default: "2.0")
  - `modelFileCount`: number (default: 1)

#### `generateInvalidHCX(errorType, baseNetwork?)`
- Creates an invalid HCX
- Parameters:
  - `errorType`: error type
  - `baseNetwork`: optional valid HCX to corrupt

---

## Implementation Details

### File Structure

```
scripts/generate-test-fixtures/
├── SPEC.md (this file)
├── generate-cx2.ts
├── generate-hcx.ts
├── lib/
│   ├── cx2-generator.ts
│   ├── hcx-generator.ts
│   ├── valid-generators.ts
│   ├── invalid-generators.ts
│   └── utils.ts
└── package.json (if needed)
```

### Dependencies

- TypeScript (or JavaScript)
- Node.js built-in modules (fs, path)
- Optionally: a CLI library like `commander` or `yargs`

### Validation

Generated files should:
1. Be valid JSON
2. Follow CX2 structure (for valid files)
3. Be properly formatted (pretty-printed)
4. Follow naming convention: `<characteristic>.<valid|invalid>.<ext>`

### Testing

The generator scripts should be testable:
- Unit tests for generator functions
- Integration tests that verify generated files are valid
- Tests for invalid file generation

---

## Usage Examples

### Generate all basic valid CX2 files

```bash
# Minimal
npm run generate:cx2 -- --type minimal --output test/fixtures/cx2/minimal.valid.cx2

# Small
npm run generate:cx2 -- --type small --output test/fixtures/cx2/small-network.valid.cx2

# Medium
npm run generate:cx2 -- --type medium --output test/fixtures/cx2/medium-network.valid.cx2

# With layout
npm run generate:cx2 -- --type small --with-layout --output test/fixtures/cx2/with-cartesian-layout.valid.cx2

# With visual style
npm run generate:cx2 -- --type small --with-visual-style --output test/fixtures/cx2/with-visual-style.valid.cx2
```

### Generate invalid CX2 files

```bash
# Missing CXVersion
npm run generate:cx2 -- --type invalid --error missing-cxversion --output test/fixtures/cx2/missing-cxversion.invalid.cx2

# Duplicate node IDs
npm run generate:cx2 -- --type invalid --error duplicate-node-ids --output test/fixtures/cx2/duplicate-node-ids.invalid.cx2

# Invalid edge reference
npm run generate:cx2 -- --type invalid --error invalid-edge-reference --output test/fixtures/cx2/invalid-edge-reference.invalid.cx2
```

### Generate HCX files

```bash
# With filter configs
npm run generate:hcx -- --type with-filter-configs --output test/fixtures/hcx/with-filter-configs.valid.cx2

# With interaction UUID
npm run generate:hcx -- --type with-interaction-uuid --interaction-uuid abc-123 --output test/fixtures/hcx/with-interaction-uuid.valid.cx2

# Invalid: missing metadata
npm run generate:hcx -- --type invalid --error missing-metadata --output test/fixtures/hcx/missing-metadata.invalid.cx2
```

---

## Future Enhancements

1. **Batch generation**: Generate multiple files at once
   ```bash
   npm run generate:cx2 -- --batch config.json
   ```

2. **Template system**: Use templates for complex networks

3. **Network analysis**: Analyze existing networks and generate similar ones

4. **Validation**: Automatically validate generated files

5. **Documentation**: Auto-generate documentation for generated files

---

## Questions to Resolve

1. Should the scripts generate deterministic networks (same seed = same network)?
2. Should we support importing from existing networks and modifying them?
3. Should we generate realistic biological networks or abstract test networks?
4. How should we handle very large networks (performance considerations)?
5. Should we support generating networks from edge lists or other formats?

