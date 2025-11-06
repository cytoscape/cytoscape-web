#!/bin/bash
# Script to automatically fix renamed files in git
# This script finds files that were renamed but not detected by git
# and uses 'git mv' to properly record the renames

set -e

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Parse command line arguments
DRY_RUN=false
if [[ "$1" == "--dry-run" ]] || [[ "$1" == "-n" ]]; then
    DRY_RUN=true
    echo "=== DRY RUN MODE - No changes will be made ==="
    echo ""
fi

# Create temporary files
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

GIT_TRACKED="$TMPDIR/git_tracked.txt"
ACTUAL_FILES="$TMPDIR/actual_files.txt"
MISSING_FILES="$TMPDIR/missing_files.txt"
NEW_FILES="$TMPDIR/new_files.txt"
RENAMES_FILE="$TMPDIR/renames.txt"

# Get git tracked files
echo "Scanning git repository..."
git ls-files | sort > "$GIT_TRACKED"

# Get actual files (excluding common ignore patterns)
find . -type f \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './.next/*' \
  -not -path './dist/*' \
  -not -path './build/*' \
  -not -path './coverage/*' \
  -not -name '.DS_Store' \
  | sed 's|^\./||' \
  | sort > "$ACTUAL_FILES"

# Find files that are tracked but missing
comm -13 "$ACTUAL_FILES" "$GIT_TRACKED" > "$MISSING_FILES"

# Find files that exist but aren't tracked
comm -23 "$ACTUAL_FILES" "$GIT_TRACKED" > "$NEW_FILES"

# Use Python to find and match renames
MISSING_FILES_VAR="$MISSING_FILES"
NEW_FILES_VAR="$NEW_FILES"
export MISSING_FILES_VAR NEW_FILES_VAR

python3 << 'PYEOF' > "$RENAMES_FILE"
import os
import sys

def pascal_to_camel(s):
    """Convert PascalCase to camelCase"""
    if not s:
        return s
    return s[0].lower() + s[1:] if len(s) > 1 else s.lower()

def normalize_case(s):
    """Normalize case for comparison"""
    return s.lower()

# Read files
missing_file_path = os.environ.get('MISSING_FILES_VAR')
new_file_path = os.environ.get('NEW_FILES_VAR')

with open(missing_file_path, 'r') as f:
    missing = [line.strip() for line in f if line.strip()]

with open(new_file_path, 'r') as f:
    new = [line.strip() for line in f if line.strip()]

# Match files
renames = []
for missing_file in missing:
    missing_dir = os.path.dirname(missing_file)
    missing_base = os.path.basename(missing_file)
    missing_name, missing_ext = os.path.splitext(missing_base)
    
    for new_file in new:
        new_dir = os.path.dirname(new_file)
        new_base = os.path.basename(new_file)
        new_name, new_ext = os.path.splitext(new_base)
        
        # Check if same directory and extension
        if missing_dir == new_dir and missing_ext == new_ext:
            # Check if it's a case change (PascalCase to camelCase)
            camel_name = pascal_to_camel(missing_name)
            if new_name == camel_name:
                renames.append((missing_file, new_file))
                break
            # Also check case-insensitive match (for case-insensitive filesystems)
            elif normalize_case(missing_name) == normalize_case(new_name):
                renames.append((missing_file, new_file))
                break

# Output renames in format: old_path|new_path
for old, new in sorted(renames):
    print(f"{old}|{new}")
PYEOF

# Count renames
RENAME_COUNT=$(wc -l < "$RENAMES_FILE" | tr -d ' ')

if [ "$RENAME_COUNT" -eq 0 ]; then
    echo "No renamed files found. All files are properly tracked by git."
    exit 0
fi

echo "Found $RENAME_COUNT file(s) that need to be renamed in git:"
echo ""

# Show what will be renamed
while IFS='|' read -r old_path new_path; do
    echo "  $old_path -> $new_path"
done < "$RENAMES_FILE"

echo ""

if [ "$DRY_RUN" = true ]; then
    echo "Dry run complete. Run without --dry-run to apply changes."
    exit 0
fi

# Confirm before proceeding
read -p "Do you want to proceed with renaming these files? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Perform the renames
echo ""
echo "Renaming files..."
SUCCESS_COUNT=0
FAILED_COUNT=0

while IFS='|' read -r old_path new_path; do
    # Check if old file exists in git index
    if git ls-files --error-unmatch "$old_path" > /dev/null 2>&1; then
        # On case-insensitive filesystems (like macOS), we need to use a temporary name
        # to avoid conflicts when renaming. The filesystem sees both names as the same file.
        TEMP_PATH="${old_path}.tmp_rename_$$"
        
        # Two-step rename: old -> temp -> new
        # This works around case-insensitive filesystem limitations
        if git mv "$old_path" "$TEMP_PATH" 2>/dev/null; then
            if git mv "$TEMP_PATH" "$new_path" 2>/dev/null; then
                echo "  ✓ $old_path -> $new_path"
                ((SUCCESS_COUNT++))
            else
                echo "  ✗ Failed: $old_path -> $new_path (second step: temp -> new)"
                # Try to restore from temp
                git mv "$TEMP_PATH" "$old_path" 2>/dev/null || true
                ((FAILED_COUNT++))
            fi
        else
            echo "  ✗ Failed: $old_path -> $new_path (first step: old -> temp)"
            ((FAILED_COUNT++))
        fi
    else
        echo "  ✗ Skipped: $old_path is not tracked by git"
        ((FAILED_COUNT++))
    fi
done < "$RENAMES_FILE"

echo ""
echo "Summary:"
echo "  Successfully renamed: $SUCCESS_COUNT"
if [ "$FAILED_COUNT" -gt 0 ]; then
    echo "  Failed/Skipped: $FAILED_COUNT"
fi

if [ "$SUCCESS_COUNT" -gt 0 ]; then
    echo ""
    echo "Files have been renamed. You can now commit the changes with:"
    echo "  git commit -m 'Rename files from PascalCase to camelCase'"
fi

