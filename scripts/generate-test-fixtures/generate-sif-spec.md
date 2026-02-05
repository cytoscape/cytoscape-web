# SIF File Generator Specification

## Overview

Script to programmatically generate SIF (Simple Interaction Format) test fixtures for Cytoscape Web testing.

## Goals

1. Generate valid SIF files with various characteristics
2. Generate invalid SIF files for error testing
3. Support different interaction types
4. Ensure generated files follow the naming convention: `<characteristic>.<valid|invalid>.sif`

---

## SIF Format Specification

SIF format: `node1 <interaction> node2`

- Nodes are separated by whitespace
- Interaction type is enclosed in angle brackets: `<interaction>`
- One interaction per line
- Self-loops are allowed: `node1 <interaction> node1`
- Multiple interactions between same nodes are allowed

### Valid SIF Examples

```
node1 <interacts> node2
node2 <binds> node3
node1 <regulates> node3
```

---

## SIF Generator Script

### Script Name
`generate-sif.ts` or `generate-sif.js`

### Command Line Interface

```bash
# Generate simple valid SIF
npm run generate:sif -- --type simple --nodes 5 --edges 10 --output test/fixtures/sif/simple.valid.sif

# Generate SIF with self-loops
npm run generate:sif -- --type with-self-loops --nodes 5 --edges 10 --output test/fixtures/sif/with-self-loops.valid.sif

# Generate SIF with complex node names
npm run generate:sif -- --type complex-names --nodes 5 --output test/fixtures/sif/complex-node-names.valid.sif

# Generate invalid SIF
npm run generate:sif -- --type invalid --error missing-interaction --output test/fixtures/sif/missing-interaction.invalid.sif
```

### Parameters

#### Required
- `--type` or `-t`: Type of SIF file to generate
  - `simple` - Basic SIF with simple interactions
  - `multiple-interactions` - Multiple different interaction types
  - `with-self-loops` - Includes self-loops
  - `complex-names` - Nodes with special characters (spaces, hyphens, etc.)
  - `various-interactions` - Various interaction types (pp, pd, etc.)
  - `invalid` - Invalid SIF file (requires `--error`)

#### Optional
- `--nodes` or `-n`: Number of nodes (default: 10)
- `--edges` or `-e`: Number of edges (default: 15)
- `--output` or `-o`: Output file path
- `--interaction-types`: Comma-separated list of interaction types (default: `interacts`)
- `--self-loop-probability`: Probability of self-loop (0.0-1.0, default: 0.0)
- `--complex-names`: Use complex node names with special characters
- `--error`: Error type for invalid files (required if `--type invalid`)
  - `empty` - Empty file
  - `malformed` - Lines not in SIF format
  - `missing-interaction` - Missing interaction type
  - `invalid-syntax` - Wrong arrow style or format

### Interaction Types

Common interaction types:
- `interacts`
- `binds`
- `regulates`
- `activates`
- `inhibits`
- `pp` (protein-protein)
- `pd` (protein-DNA)
- `controls`
- `catalyzes`

### Generator Functions

#### `generateValidSIF(options)`
- Creates a valid SIF file
- Parameters:
  - `nodeCount`: number of nodes
  - `edgeCount`: number of edges
  - `interactionTypes`: string[] (default: `['interacts']`)
  - `selfLoopProbability`: number (0.0-1.0)
  - `useComplexNames`: boolean
  - `nodeNames`: string[] (optional, custom node names)

#### `generateInvalidSIF(errorType, baseSIF?)`
- Creates an invalid SIF file
- Parameters:
  - `errorType`: error type
  - `baseSIF`: optional valid SIF to corrupt

### Examples

#### Simple Valid SIF
```
node1 <interacts> node2
node2 <interacts> node3
node3 <interacts> node1
```

#### Multiple Interaction Types
```
node1 <binds> node2
node2 <regulates> node3
node3 <activates> node1
node1 <inhibits> node4
```

#### With Self-Loops
```
node1 <interacts> node2
node1 <regulates> node1
node2 <binds> node3
```

#### Complex Node Names
```
node-1 <interacts> node_2
node with spaces <binds> node-with-hyphens
node_3 <regulates> node.4
```

#### Invalid: Missing Interaction
```
node1 node2
node2 node3
```

#### Invalid: Wrong Syntax
```
node1 -> node2
node2 => node3
```

#### Invalid: Empty File
```
(empty)
```

---

## Usage Examples

### Generate valid SIF files

```bash
# Simple SIF
npm run generate:sif -- --type simple --nodes 10 --edges 15 --output test/fixtures/sif/simple.valid.sif

# Multiple interactions
npm run generate:sif -- --type multiple-interactions --interaction-types "binds,regulates,activates" --nodes 10 --edges 20 --output test/fixtures/sif/multiple-interactions.valid.sif

# With self-loops
npm run generate:sif -- --type with-self-loops --self-loop-probability 0.2 --nodes 10 --edges 15 --output test/fixtures/sif/with-self-loops.valid.sif

# Complex node names
npm run generate:sif -- --type complex-names --nodes 10 --edges 15 --output test/fixtures/sif/complex-node-names.valid.sif

# Various interaction types
npm run generate:sif -- --type various-interactions --interaction-types "pp,pd,controls,catalyzes" --nodes 10 --edges 20 --output test/fixtures/sif/various-interactions.valid.sif
```

### Generate invalid SIF files

```bash
# Empty file
npm run generate:sif -- --type invalid --error empty --output test/fixtures/sif/empty.invalid.sif

# Malformed
npm run generate:sif -- --type invalid --error malformed --output test/fixtures/sif/malformed.invalid.sif

# Missing interaction
npm run generate:sif -- --type invalid --error missing-interaction --output test/fixtures/sif/missing-interaction.invalid.sif

# Invalid syntax
npm run generate:sif -- --type invalid --error invalid-syntax --output test/fixtures/sif/invalid-syntax.invalid.sif
```

---

## Output Format

SIF files are plain text, one interaction per line. No header or footer.

Example:
```
node1 <interacts> node2
node2 <binds> node3
node3 <regulates> node1
```

---

## Node Name Generation

### Simple Names
- Pattern: `node1`, `node2`, `node3`, ...
- Or: `n1`, `n2`, `n3`, ...

### Complex Names
- Include spaces: `node 1`, `node with spaces`
- Include hyphens: `node-1`, `node-with-hyphens`
- Include underscores: `node_1`, `node_with_underscores`
- Include dots: `node.1`, `node.with.dots`
- Mixed: `node-1 with spaces`

---

## Edge Generation Strategy

1. **Random edges**: Generate random edges between nodes
2. **Connected graph**: Ensure all nodes are connected
3. **Self-loops**: Add self-loops based on probability
4. **Multiple edges**: Allow multiple edges between same nodes (different interactions)

---

## Future Enhancements

1. **Biological realism**: Generate networks that mimic biological networks
2. **Edge weights**: Support edge weights (if SIF format allows)
3. **Node attributes**: Support node attributes in comments
4. **Directed/undirected**: Support both directed and undirected networks
5. **Network topology**: Generate specific topologies (star, ring, complete, etc.)

