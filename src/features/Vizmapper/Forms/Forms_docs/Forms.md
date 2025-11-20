# Vizmapper Forms Feature

## Overview

The `Vizmapper/Forms` feature provides the editable UI for configuring visual properties and their mapping functions. It lets users:
- Set default values for visual properties
- Configure Discrete, Continuous, and Passthrough mappings
- Inspect and edit values via popovers (color pickers, number inputs, etc.)
- Apply node/edge-level bypasses (per-element overrides)

## Architecture

- **Top-level Forms**
  - `VisualPropertyValueForm`: Chooses and renders the correct editor for a visual property value (e.g., color, number, string) and wraps it with confirm/cancel mechanics.
  - `DefaultValueForm`: Edits the default (non-mapped) value for a visual property.
  - `BypassForm`: Manages per-element overrides; adds/removes bypass entries and provides editing controls.

- **Mapping Forms** (`Forms/MappingForm`)
  - `index.tsx` (MappingForm): Entry for selecting a column and a mapping type (Discrete, Continuous, Passthrough); renders sub-forms based on selection.
  - `DiscreteMappingForm`: Shows a table of unique attribute values and lets users assign a visual property value to each.
  - `ContinuousMappingForm`:
    - `ContinuousNumberMappingForm`: Numeric control points, min/max, and a line chart for number-based mappings.
    - `ContinuousColorMappingForm`: Control points and color gradient editor; supports swatches and color pickers.
    - `ContinuousDiscreteMappingForm`: Fallback when value types are neither numeric nor color.

- **Support Components**
  - `VisualPropertyViewBox`: Compact view to display current VP value/state.

## Behavior

### Value Editing Lifecycle
1. User opens an editor (popover/dialog) from a VP row.
2. `VisualPropertyValueForm` renders the appropriate input (number, color, string, boolean, etc.)
3. Edits are confirmed or cancelled:
   - Confirm → store updates via `VisualStyleStore` and undo stack push if applicable
   - Cancel → local state reset; no store updates

### Discrete Mapping
- Builds the value list from the selected column and existing mapping keys.
- Allows multi-select operations (select all/none); batch delete of mapping entries.
- Updates propagate via `setDiscreteMappingValue` and are recorded for undo/redo.

### Continuous Mapping
- Validates attribute types (only numeric types are eligible).
- Supports min/max editing and control point manipulation (add/remove/drag).
- Numeric mappings display a line chart; color mappings display a gradient and color editors.

### Bypass
- Adds per-element overrides (by ID or selection) that take precedence over mapping/defaults.
- Provides remove-all and per-entry deletion.

## Integration Points
- **VisualStyleStore**: Reads/writes visual property defaults and mappings.
- **TableStore**: Supplies columns, types, and values for mapping selection.
- **ViewModelStore**: Provides selection context for bypass operations.
- **UndoStore**: Records changes (set/delete mapping entries, bypass edits) for undo/redo.

## Design Decisions
- **Single entry point per VP**: `VisualPropertyValueForm` centralizes type-to-editor dispatch for consistency.
- **Column-driven mapping**: Mapping forms are driven by actual table metadata/values to prevent invalid choices.
- **Explicit confirm/cancel**: Prevents accidental writes; enables clean undoable operations.

## Future Improvements
- In-form search/filter for DiscreteMappingForm with large value sets.
- Keyboard shortcuts for common actions (add point, delete mapping entry).
- Preview panel showing immediate visual impact on sample elements.
