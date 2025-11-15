# Generate State Structure Diagram

This script analyzes exported application state JSON files and generates a visual Mermaid diagram showing the state structure with TypeScript types instead of JSON blobs.

## Usage

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/generate-state-diagram/generate-state-diagram.ts <state-json-file>
```

Example:
```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/generate-state-diagram/generate-state-diagram.ts cyweb-app-state-1.0.4-2025-11-14.json
```

Then generate PNG/SVG:
```bash
./scripts/generate-state-diagram/generate-png.sh
```

## What It Does

1. **Parses the JSON state file** - Reads the exported application state
2. **Maps JSON structures to TypeScript types** - Replaces JSON blobs with their corresponding types:
   - `workspace` → `Workspace`
   - `networks` → `Map<IdType, Network>`
   - `tables` → `Record<IdType, {nodeTable: Table, edgeTable: Table}>`
   - `visualStyles` → `Record<IdType, VisualStyle>`
   - etc.
3. **Generates a Mermaid diagram** - Creates a visual graph showing:
   - Store structure (stores grouped in a subgraph)
   - Type relationships
   - Data organization patterns (Records, Arrays, etc.)

## Output

The script generates:
- `state-structure-diagram.mmd` - Mermaid diagram file

You can then:
1. View it in any Mermaid-compatible viewer (GitHub, VS Code, etc.)
2. Convert to PNG/SVG using `@mermaid-js/mermaid-cli`:
   ```bash
   npx @mermaid-js/mermaid-cli -i state-structure-diagram.mmd -o state-structure-diagram.png
   ```

## Features

- **Type Inference**: Automatically maps JSON structures to TypeScript types
- **Store Recognition**: Identifies and groups stores together
- **Record Detection**: Recognizes `Record<IdType, T>` patterns
- **Depth Limiting**: Limits recursion to avoid overly complex diagrams
- **Circular Reference Handling**: Skips circular references and non-serializable values

## Color Coding

- **Orange** - Store nodes (Zustand stores)
- **Purple** - Record types (`Record<IdType, T>`)
- **Blue** - Array types
- **Green** - Regular type nodes

## Example Output Structure

```
ApplicationState
├── stores (subgraph)
│   ├── workspace → Workspace
│   ├── network → Map<IdType, Network>
│   ├── table → Record<IdType, {nodeTable, edgeTable}>
│   ├── visualStyle → Record<IdType, VisualStyle>
│   └── ...
└── summary → Summary
```

## Requirements

- Node.js
- TypeScript
- ts-node (for running the script)

