# Search Functionality Documentation

## Overview

The search functionality uses [Fuse.js](https://fusejs.io/) to provide fuzzy and exact text search across network node and edge tables. The search supports tokenization, exact matching, fuzzy matching, and boolean operators.

## How Search Works

### 1. Indexing

- **Indexed Columns**: Only `String` and `ListString` column types are indexed
- **Index Creation**: When a network is loaded, separate Fuse.js indices are created for:
  - Node table (all string columns)
  - Edge table (all string columns)
- **Index Configuration**:
  - `useExtendedSearch: true` - Enables Fuse.js extended search syntax
  - `threshold: 0.0` - No fuzzy threshold (exact matching by default)
  - `ignoreLocation: true` - Matches can occur anywhere in the text
  - `includeScore: true` - Includes relevance scores
  - `includeMatches: true` - Includes match details

### 2. Query Tokenization

The search query is tokenized before execution:

- **Delimiters**: Commas (`,`) and whitespace are treated as token separators
- **Quoted Phrases**: Text within double quotes (`"..."`) is treated as a single token
  - Example: `"gene name", protein` → tokens: `["gene name", "protein"]`
- **Unmatched Quotes**: If quotes are not balanced, they're treated as regular characters
- **Empty Tokens**: Empty tokens are filtered out

**Examples:**
- `YL protein` → `["YL", "protein"]`
- `"gene name", YL` → `["gene name", "YL"]`
- `protein, "cell cycle"` → `["protein", "cell cycle"]`

### 3. Search Modes

#### Fuzzy Search (Default)
- When `exact: false` in search options
- Uses fuzzy matching to find similar text
- Tokens are searched as-is: `token`
- Example: `YL` matches "YL", "YAL", "YELLOW", etc.

#### Exact Search
- When `exact: true` in search options
- Uses exact matching with Fuse.js `=` operator
- Single-word tokens: `=token`
- Multi-word tokens: `="token"`
- Example: `YL` matches only "YL" exactly

### 4. Boolean Operators

The search supports two boolean operators:

#### AND Operator
- All tokens must match for a result to be included
- Example: `protein YL` with AND operator finds items that contain both "protein" AND "YL"

#### OR Operator (Default)
- Any token matching includes the result
- Example: `protein YL` with OR operator finds items that contain "protein" OR "YL"

### 5. Search Execution

1. Query is tokenized into an array of tokens
2. Each token is searched independently against the Fuse.js index
3. Results are combined based on the selected operator (AND/OR)
4. Matching nodes/edges are selected in the network view

## Usage Examples

### Basic Search
```
protein
```
Finds all nodes/edges containing "protein" (fuzzy match by default)

### Exact Phrase Search
```
"gene name"
```
Finds all nodes/edges containing the exact phrase "gene name"

### Multiple Terms (OR)
```
protein, YL
```
Finds all nodes/edges containing "protein" OR "YL"

### Multiple Terms (AND)
```
protein YL
```
With AND operator selected, finds all nodes/edges containing both "protein" AND "YL"

### Mixed Quoted and Unquoted
```
"cell cycle", protein
```
Finds all nodes/edges containing the exact phrase "cell cycle" OR "protein"

## Limitations

1. **Column Types**: Only `String` and `ListString` columns are searchable. Numeric, boolean, and other types are not indexed.
2. **Case Sensitivity**: Search is case-insensitive
3. **Fuzzy Matching**: When fuzzy search is enabled, the threshold is set to 0.0, meaning exact matching by default. Fuse.js will still perform some fuzzy matching for similar strings.
4. **Performance**: Large networks with many string columns may experience slower indexing and search times.

## Implementation Details

### Index Creation
- Indices are created when a network is loaded
- Indices are stored per network ID in the FilterStore
- Indices are recreated when the exact search mode changes

### Search State Management
- Search state is managed in the FilterStore
- States include: `READY`, `IN_PROGRESS`, `DONE`
- Search results update the network view selection

### Search Targets
- Users can select whether to search nodes, edges, or both
- Default is nodes only

