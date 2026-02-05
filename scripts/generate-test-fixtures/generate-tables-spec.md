# Table File Generator Specification

## Overview

Script to programmatically generate CSV, TSV, and TXT table test fixtures for Cytoscape Web testing.

## Goals

1. Generate valid table files (CSV, TSV, TXT) with various characteristics
2. Generate invalid table files for error testing
3. Support different delimiters (comma, tab, semicolon, space)
4. Support different data types and formats
5. Ensure generated files follow the naming convention: `<characteristic>.<valid|invalid>.<ext>`

---

## Table Generator Script

### Script Name
`generate-tables.ts` or `generate-tables.js`

### Command Line Interface

```bash
# Generate CSV with headers
npm run generate:tables -- --type csv --with-headers --rows 10 --columns 5 --output test/fixtures/tables/csv-with-headers.valid.csv

# Generate CSV without headers
npm run generate:tables -- --type csv --no-headers --rows 10 --columns 5 --output test/fixtures/tables/csv-no-headers.valid.csv

# Generate TSV file
npm run generate:tables -- --type tsv --with-headers --rows 10 --output test/fixtures/tables/tsv-with-headers.valid.tsv

# Generate invalid CSV
npm run generate:tables -- --type invalid --error inconsistent-columns --output test/fixtures/tables/inconsistent-columns.invalid.csv
```

### Parameters

#### Required
- `--type` or `-t`: Type of table file
  - `csv` - Comma-separated values
  - `tsv` - Tab-separated values
  - `txt` - Space or semicolon-separated
  - `invalid` - Invalid table file (requires `--error`)

#### Optional
- `--rows` or `-r`: Number of data rows (default: 10)
- `--columns` or `-c`: Number of columns (default: 5)
- `--with-headers` or `--no-headers`: Include header row (default: `--with-headers`)
- `--delimiter`: Custom delimiter (default: based on type)
  - CSV: `,`
  - TSV: `\t`
  - TXT: ` ` (space) or `;` (semicolon)
- `--output` or `-o`: Output file path
- `--data-types`: Comma-separated data types (default: `string,number,string`)
  - Options: `string`, `number`, `integer`, `float`, `boolean`, `date`, `mixed`
- `--quoted-values`: Use quoted values (default: false for CSV, true if values contain delimiter)
- `--decimal-delimiter`: Decimal delimiter for numbers (default: `.`, can be `,` for European format)
- `--edge-list`: Generate edge list format (source, target columns)
- `--node-attributes`: Generate node attributes table (node ID + attributes)
- `--edge-attributes`: Generate edge attributes table (edge ID + attributes)
- `--error`: Error type for invalid files (required if `--type invalid`)
  - `inconsistent-columns` - Rows with different column counts
  - `no-delimiter` - No recognizable delimiter
  - `empty` - Empty file
  - `starts-empty-lines` - Leading empty lines
  - `malformed-quotes` - Unclosed quotes

### Generator Functions

#### `generateValidTable(options)`
- Creates a valid table file
- Parameters:
  - `type`: `'csv' | 'tsv' | 'txt'`
  - `rowCount`: number
  - `columnCount`: number
  - `withHeaders`: boolean
  - `delimiter`: string (optional, auto-determined by type)
  - `dataTypes`: string[]
  - `quotedValues`: boolean
  - `decimalDelimiter`: string
  - `edgeList`: boolean
  - `nodeAttributes`: boolean
  - `edgeAttributes`: boolean

#### `generateInvalidTable(errorType, baseTable?)`
- Creates an invalid table file
- Parameters:
  - `errorType`: error type
  - `baseTable`: optional valid table to corrupt

### Examples

#### CSV with Headers
```csv
name,age,city,score,active
Alice,25,New York,95.5,true
Bob,30,London,87.2,false
Charlie,22,Paris,92.1,true
```

#### CSV without Headers
```csv
Alice,25,New York,95.5,true
Bob,30,London,87.2,false
Charlie,22,Paris,92.1,true
```

#### CSV with Quoted Values
```csv
name,description,value
"Alice","Person from New York, NY",25
"Bob","Person from London, UK",30
```

#### TSV with Headers
```tsv
name	age	city	score
Alice	25	New York	95.5
Bob	30	London	87.2
```

#### Space-Delimited TXT
```txt
name age city score
Alice 25 New_York 95.5
Bob 30 London 87.2
```

#### Semicolon-Delimited TXT
```txt
name;age;city;score
Alice;25;New York;95.5
Bob;30;London;87.2
```

#### Edge List Format
```csv
source,target
node1,node2
node2,node3
node1,node3
```

#### Node Attributes Table
```csv
node_id,type,score,active
n1,protein,95.5,true
n2,protein,87.2,false
n3,gene,92.1,true
```

#### European Decimal Format
```csv
name,value,price
Alice,25,95,5
Bob,30,87,2
```

#### Invalid: Inconsistent Columns
```csv
name,age,city
Alice,25,New York,extra
Bob,30
Charlie,22,Paris,score,active
```

#### Invalid: No Delimiter
```csv
This is just text without any delimiters
Another line of text
```

#### Invalid: Empty File
```
(empty)
```

#### Invalid: Starts with Empty Lines
```csv


name,age,city
Alice,25,New York
```

#### Invalid: Malformed Quotes
```csv
name,description
Alice,"Unclosed quote
Bob,"Properly closed",value
```

---

## Usage Examples

### Generate valid table files

```bash
# CSV with headers
npm run generate:tables -- --type csv --with-headers --rows 10 --columns 5 --output test/fixtures/tables/csv-with-headers.valid.csv

# CSV without headers
npm run generate:tables -- --type csv --no-headers --rows 10 --columns 5 --output test/fixtures/tables/csv-no-headers.valid.csv

# CSV with quoted values
npm run generate:tables -- --type csv --quoted-values --rows 10 --output test/fixtures/tables/csv-quoted-values.valid.csv

# CSV with mixed data types
npm run generate:tables -- --type csv --data-types "string,number,date,boolean" --rows 10 --output test/fixtures/tables/csv-mixed-types.valid.csv

# CSV with European decimal format
npm run generate:tables -- --type csv --decimal-delimiter "," --rows 10 --output test/fixtures/tables/csv-european-decimal.valid.csv

# TSV with headers
npm run generate:tables -- --type tsv --with-headers --rows 10 --output test/fixtures/tables/tsv-with-headers.valid.tsv

# TSV without headers
npm run generate:tables -- --type tsv --no-headers --rows 10 --output test/fixtures/tables/tsv-no-headers.valid.tsv

# Space-delimited TXT
npm run generate:tables -- --type txt --delimiter " " --rows 10 --output test/fixtures/tables/space-delimited.valid.txt

# Semicolon-delimited TXT
npm run generate:tables -- --type txt --delimiter ";" --rows 10 --output test/fixtures/tables/semicolon-delimited.valid.txt

# Edge list
npm run generate:tables -- --type csv --edge-list --rows 20 --output test/fixtures/tables/edge-list.valid.csv

# Node attributes
npm run generate:tables -- --type csv --node-attributes --rows 50 --output test/fixtures/tables/node-attributes.valid.csv

# Edge attributes
npm run generate:tables -- --type csv --edge-attributes --rows 30 --output test/fixtures/tables/edge-attributes.valid.csv
```

### Generate invalid table files

```bash
# Inconsistent columns
npm run generate:tables -- --type invalid --error inconsistent-columns --output test/fixtures/tables/inconsistent-columns.invalid.csv

# No delimiter
npm run generate:tables -- --type invalid --error no-delimiter --output test/fixtures/tables/no-delimiter.invalid.csv

# Empty file
npm run generate:tables -- --type invalid --error empty --output test/fixtures/tables/empty.invalid.csv

# Starts with empty lines
npm run generate:tables -- --type invalid --error starts-empty-lines --output test/fixtures/tables/starts-empty-lines.invalid.csv

# Malformed quotes
npm run generate:tables -- --type invalid --error malformed-quotes --output test/fixtures/tables/malformed-quotes.invalid.csv
```

---

## Data Type Generation

### String
- Simple: `"value1"`, `"value2"`
- With spaces: `"New York"`, `"San Francisco"`
- With special chars: `"O'Brien"`, `"value,with,commas"`

### Number
- Integer: `25`, `100`, `-5`
- Float: `95.5`, `3.14159`, `-12.34`
- Scientific: `1.5e10`, `2.3E-5`

### Boolean
- `true`, `false`
- Or: `1`, `0`
- Or: `yes`, `no`

### Date
- ISO format: `2024-01-15`
- US format: `01/15/2024`
- European format: `15/01/2024`

### Mixed
- Random mix of all types

---

## Special Formats

### Edge List
Two columns: `source`, `target`
```csv
source,target
node1,node2
node2,node3
node1,node3
```

### Node Attributes
First column is node ID, followed by attributes:
```csv
node_id,type,score,active
n1,protein,95.5,true
n2,protein,87.2,false
```

### Edge Attributes
First column is edge ID, followed by attributes:
```csv
edge_id,interaction,weight,confidence
e1,interacts,0.95,high
e2,binds,0.87,medium
```

---

## Output Format

Table files are plain text with:
- One row per line
- Columns separated by delimiter
- Optional header row
- Optional quoted values (if they contain delimiter or special characters)

---

## Future Enhancements

1. **Real data**: Use realistic biological data
2. **Large files**: Support generating very large table files
3. **Encoding**: Support different character encodings (UTF-8, Latin-1, etc.)
4. **BOM**: Support Byte Order Mark for UTF-8
5. **Line endings**: Support different line endings (LF, CRLF, CR)
6. **Missing values**: Support missing/null values in various formats
7. **Custom formats**: Support custom table formats

