# Batch Renaming Workflow

This document describes the process for batch renaming files to conform to naming standards.

## Process Overview

1. Generate all filenames into CSV
2. For each name in the CSV, enter its changed name that conforms to the naming standards
3. Tell AI to rename them

## Usage Instructions

### Step 1: Generate Filenames CSV

Use the `generate-filenames-csv.ts` script to create a CSV file containing all filenames in a folder:

```bash
# Basic usage - scan current directory, output to filenames.csv
npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts

# Scan a specific folder
npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts src/features

# Specify output file
npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts src/features output.csv

# Non-recursive (only immediate children, no subdirectories)
npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts src/features output.csv --no-recursive

# Explicitly recursive (default behavior)
npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts src/features output.csv --recursive
```

**Output CSV Columns:**

- `Filename` - The name of the file or directory
- `Relative Path` - Path relative to the scanned folder
- `New Name` - Empty column for entering the new filename (fill this in during Step 2)
- `Complete` - Empty column for marking completion status (e.g., "yes", "done", "✓", or leave empty if not completed)

### Step 2: Edit CSV with New Names

1. Open the generated CSV file in a spreadsheet application (Excel, Google Sheets, Numbers, etc.)
2. For each file that needs renaming, enter the new name in the `New Name` column
3. Leave the `New Name` column empty for files that don't need renaming
4. Save the CSV file

**Example:**

```csv
Filename,Relative Path,New Name,Complete
OldName.ts,OldName.ts,NewName.ts,yes
AnotherFile.tsx,AnotherFile.tsx,,
```

### Step 3: Request AI to Perform Renaming

Provide the AI with:

1. The path to the CSV file
2. Instructions to rename files based on the `New Name` column
3. Any specific requirements (e.g., update imports, handle case sensitivity)

**Example AI Request:**

```
Please rename all files in the CSV file `output.csv` based on the "New Name" column.
Only rename files that have a value in the "New Name" column (skip empty entries).
Make sure to update all imports that reference these files throughout the codebase.
```

## Tips

- **Backup first**: Always commit your changes to git before batch renaming
- **Test incrementally**: Start with a small subset of files to verify the renaming works correctly
- **Update imports**: After renaming, ensure all imports are updated (AI can help with this)
- **Check for conflicts**: Verify that new filenames don't conflict with existing files
