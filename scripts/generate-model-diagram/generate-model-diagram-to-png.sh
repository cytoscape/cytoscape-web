#!/bin/bash
# Script to generate a Mermaid diagram as PNG from model relationships
# 
# Usage:
#   npm run generate-model-diagram
#   or
#   ./scripts/generate-model-diagram-to-png.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Generating model relationship diagram...${NC}"

# Check if mmdc is installed locally or globally
if [ -f "./node_modules/.bin/mmdc" ]; then
    MMDC="./node_modules/.bin/mmdc"
elif command -v mmdc &> /dev/null; then
    MMDC="mmdc"
else
    echo -e "${YELLOW}⚠️  @mermaid-js/mermaid-cli not found. Installing locally...${NC}"
    npm install --save-dev @mermaid-js/mermaid-cli
    MMDC="./node_modules/.bin/mmdc"
fi

# Extract Mermaid diagram from markdown file or use existing .mmd file
MMD_FILE="docs/models-diagram.mmd"
PNG_FILE="docs/models-diagram.png"
MARKDOWN_FILE="docs/models-relationship-diagram.md"

# Process the diagram
if [ -f "$MARKDOWN_FILE" ]; then
  # Extract the mermaid diagram from the markdown file and filter out store models
  echo -e "${BLUE}Extracting Mermaid diagram from markdown (excluding store models)...${NC}"
  node -e "
  const fs = require('fs');
  const content = fs.readFileSync('$MARKDOWN_FILE', 'utf8');
  const match = content.match(/\`\`\`mermaid\\n([\\s\\S]*?)\`\`\`/);
  if (match) {
    let diagram = match[1];
    
    // Filter out store models
    const lines = diagram.split('\\n');
    const filteredLines = lines.filter(line => {
      // Remove lines that define store model nodes
      if (line.match(/StoreModel\\[/)) {
        return false;
      }
      // Remove lines that are store model definitions
      if (line.match(/^\\s*\\w*StoreModel\\[/)) {
        return false;
      }
      // Remove relationships involving store models
      if (line.match(/StoreModel.*-->/) || line.match(/-->.*StoreModel/)) {
        return false;
      }
      // Remove store layer comment section
      if (line.match(/Store Layer/) || line.match(/Store Models/)) {
        return false;
      }
      // Remove store model styling
      if (line.match(/storeModel/)) {
        return false;
      }
      return true;
    });
    
    let filteredDiagram = filteredLines.join('\\n');
    fs.writeFileSync('$MMD_FILE', filteredDiagram);
    console.log('✅ Extracted Mermaid diagram (store models excluded)');
  } else {
    console.error('❌ Could not find Mermaid diagram in markdown file');
    process.exit(1);
  }
  "
elif [ ! -f "$MMD_FILE" ]; then
  echo -e "❌ Could not find $MARKDOWN_FILE or $MMD_FILE"
  exit 1
else
  echo -e "${BLUE}Using existing Mermaid diagram file...${NC}"
fi

# Add styling for thicker edges and ensure white background styling
echo -e "${BLUE}Adding styling for thicker edges...${NC}"
node -e "
const fs = require('fs');
let diagram = fs.readFileSync('$MMD_FILE', 'utf8');

// Remove existing linkStyle if any
diagram = diagram.replace(/\\s*linkStyle\\s+\\d+\\s+stroke-width:[^\\n]*\\n/g, '');

// Count arrow relationships to add styling
const lines = diagram.split('\\n');
let edgeIndex = 0;
const styleLines = [];

lines.forEach(line => {
  // Match arrow relationships (e.g., 'Network --> Node')
  if (line.match(/\\w+\\s*-->\\s*\\w+/)) {
    styleLines.push(\`    linkStyle \${edgeIndex} stroke-width:3px\`);
    edgeIndex++;
  }
});

// Add styling section before classDef if it exists, otherwise at the end
if (styleLines.length > 0) {
  const styleSection = '\\n    %% Styling for thicker edges\\n' + styleLines.join('\\n') + '\\n';
  
  if (diagram.includes('classDef')) {
    diagram = diagram.replace(/(\\n\\s*%% Styling)/, styleSection + '\$1');
    if (!diagram.includes('Styling for thicker edges')) {
      // Insert before classDef
      diagram = diagram.replace(/(\\n\\s*%% Styling)/, styleSection);
      if (!diagram.includes('Styling for thicker edges')) {
        diagram = diagram.replace(/(\\n\\s*classDef)/, styleSection + '\$1');
      }
    }
  } else {
    diagram += styleSection;
  }
}

fs.writeFileSync('$MMD_FILE', diagram);
console.log(\`✅ Added styling for \${edgeIndex} edges (3px stroke-width)\`);
"

# Generate PNG from Mermaid file with white background
echo -e "${BLUE}Generating PNG from Mermaid diagram (white background, thick edges)...${NC}"
$MMDC -i "$MMD_FILE" -o "$PNG_FILE" -b white -w 2400 -H 1800

if [ -f "$PNG_FILE" ]; then
    echo -e "${GREEN}✅ Successfully generated: $PNG_FILE${NC}"
    echo -e "${GREEN}   File size: $(du -h "$PNG_FILE" | cut -f1)${NC}"
    echo -e "${GREEN}   Location: $(pwd)/$PNG_FILE${NC}"
else
    echo "❌ Failed to generate PNG"
    exit 1
fi

