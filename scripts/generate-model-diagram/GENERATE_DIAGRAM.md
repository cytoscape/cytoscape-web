# Generate Model Diagram PNG

Quick guide to generate a PNG diagram from the Mermaid model relationship diagram.

## Quick Start

```bash
npm run generate-model-diagram
```

This will:

1. Extract the Mermaid diagram from `docs/models-relationship-diagram.md`
2. Convert it to PNG format
3. Save it as `docs/models-diagram.png`

## Requirements

The script will automatically install `@mermaid-js/mermaid-cli` if needed (as a dev dependency).

## Manual Steps

If you prefer to run manually:

```bash
# Install mermaid-cli (one time)
npm install --save-dev @mermaid-js/mermaid-cli

# Run the script
./scripts/generate-model-diagram-to-png.sh
```

## Output

The PNG will be saved to:

- `docs/models-diagram.png` (2400x1800px, transparent background)

## Updating the Diagram

1. Edit the Mermaid diagram in `docs/models-relationship-diagram.md`
2. Run `npm run generate-model-diagram`
3. The PNG will be regenerated with your changes

## Troubleshooting

### "mmdc not found"

The script will automatically install it. If it still fails:

```bash
npm install --save-dev @mermaid-js/mermaid-cli
```

### "Could not find Mermaid diagram"

Make sure `docs/models-relationship-diagram.md` contains a Mermaid code block:

````markdown
```mermaid
graph TB
    ...
```
````

````

### PNG is too small/large
Edit the script `scripts/generate-model-diagram-to-png.sh` and change:
```bash
-w 2400 -H 1800  # width x height in pixels
````
