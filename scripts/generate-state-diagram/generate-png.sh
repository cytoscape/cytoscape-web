#!/bin/bash
# Generate PNG from state structure Mermaid diagram

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MMD_FILE="${SCRIPT_DIR}/state-structure-diagram.mmd"
PNG_FILE="${SCRIPT_DIR}/state-structure-diagram.png"
SVG_FILE="${SCRIPT_DIR}/state-structure-diagram.svg"

if [ ! -f "$MMD_FILE" ]; then
    echo "Error: Mermaid file not found: $MMD_FILE"
    echo "Please run generate-state-diagram.ts first"
    exit 1
fi

echo "Generating PNG from Mermaid diagram..."
npx @mermaid-js/mermaid-cli -i "$MMD_FILE" -o "$PNG_FILE" -w 3200 -H 16000 -s 1.5 -b white

if [ $? -eq 0 ]; then
    echo "✓ PNG generated: $PNG_FILE"
else
    echo "✗ Failed to generate PNG"
    exit 1
fi

echo "Generating SVG from Mermaid diagram..."
npx @mermaid-js/mermaid-cli -i "$MMD_FILE" -o "$SVG_FILE" -b transparent

if [ $? -eq 0 ]; then
    echo "✓ SVG generated: $SVG_FILE"
else
    echo "✗ Failed to generate SVG"
    exit 1
fi

echo ""
echo "Generated files:"
echo "  - $PNG_FILE"
echo "  - $SVG_FILE"

