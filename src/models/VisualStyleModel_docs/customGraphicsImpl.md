# Custom Graphics Implementation

## Overview

The custom graphics implementation enables rendering pie charts, ring charts (donut charts), and images on network nodes in Cytoscape.js. This module transforms user-configured custom graphics properties into Cytoscape.js style properties that control chart appearance, slice colors, sizes, and positioning.

**File Location**: `src/models/VisualStyleModel/impl/customGraphicsImpl.ts`

## Architecture

The implementation is organized around three main concerns:

1. **Property Name Management**: Maps slice indices to view model property names for colors and sizes
2. **Visual Property Selection**: Identifies and filters custom graphics visual properties from the full set
3. **Property Computation**: Converts custom graphics configurations into Cytoscape.js style tuples

The module supports up to 16 slices per chart, with each slice having independent color and size properties.

## Behavior

### Custom Graphics Selection

The system has 9 custom graphic slots (`nodeImageChart1` through `nodeImageChart9`). When selecting which slot to use, the system follows this priority:

1. **Fully Valid Graphics**: A custom graphic is considered valid if:
   - Its default value is a supported type (PieChart, RingChart, or Image)
   - All bypass values are also supported types
   - The first such graphic slot is selected

2. **Empty Graphics Fallback**: If no fully valid graphics exist, the system selects the first slot with `None` type (an empty/unconfigured slot that can be safely used)

3. **Data Preservation**: If all 9 slots are filled with unsupported graphics (not None, not PieChart/RingChart/Image), the system returns `undefined`

**Data Preservation Rationale**: When all slots contain unsupported custom graphics (e.g., from a different system version, legacy format, or future graphic types not yet implemented), returning `undefined` prevents overwriting any existing data. The system takes no action rather than replacing unsupported graphics with None or other defaults. This ensures backward compatibility and data integrity when working with networks that have custom graphics from other sources or older versions.

**Example Scenarios**:

- **Scenario 1**: Slots 1-3 have PieChart, slot 4 has None → Returns slot 1 (valid graphic)
- **Scenario 2**: All slots have None → Returns slot 1 (empty slot, safe to use)
- **Scenario 3**: All 9 slots have unsupported graphics → Returns `undefined` (preserve all data, take no action)

This behavior ensures that only properly configured custom graphics are used for rendering, while gracefully handling empty slots, and protecting existing unsupported graphics from accidental overwrites.

### Pie Chart Computation

When computing pie chart properties for a node:

1. **Data Aggregation**: The system sums all data column values from the node's row data
2. **Size Calculation**: Chart size is computed as the minimum of node width and height, minus 4px padding (to match Cytoscape Desktop behavior)
3. **Slice Percentage Calculation**: Each slice's percentage is calculated as its value divided by the total value
4. **Division by Zero Handling**: If all data values sum to zero:
   - Slices are distributed equally (e.g., 3 slices = 33.33% each)
   - This prevents `NaN` or `Infinity` values that would break CSS rendering
5. **Reversed Order**: Colors and data columns are reversed to match Cytoscape.js rendering order (slices render from bottom, counter-clockwise)
6. **Property Generation**: For each slice, the system generates:
   - A background color property (e.g., `pie1BackgroundColor`)
   - A background size property (e.g., `pie1BackgroundSize`) with percentage value

### Ring Chart Computation

Ring charts behave identically to pie charts, with one additional property:

- **Hole Size**: The inner hole size is specified as a ratio (0-1) and converted to a percentage string (e.g., 0.4 → "40%")

The hole size property (`pieHole`) is added to the computed properties alongside the standard pie chart properties.

### Angle Conversion

The system converts angles from the view model format to Cytoscape.js format:

- **View Model Format**: 0° = top, clockwise rotation
- **Cytoscape.js Format**: 0° = right, counter-clockwise rotation
- **Conversion Formula**: `((90 - angle) % 360 + 360) % 360`

This ensures that angles specified in the UI match user expectations when rendered in Cytoscape.js.

### Missing Data Handling

When node row data is missing attributes referenced by the custom graphics configuration:

- Missing attributes are treated as `0`
- This allows charts to render even when some data columns are absent
- The total value calculation includes these zeros, affecting slice percentages

### Invalid Slice Indices

When slice indices fall outside the valid range (1-16):

- The system logs a debug warning
- Fallback property names are generated (e.g., `pie17BackgroundColor`)
- No errors are thrown, allowing graceful degradation

### Image Graphics

Image graphics are currently not implemented. When an Image type is encountered:

- The system returns an empty array of properties
- No errors are thrown
- This allows the system to handle Image types without breaking

## Design Decisions

### Slice Limit of 16

**Decision**: Pie charts support a maximum of 16 slices.

**Rationale**:

- Balances visual clarity with flexibility
- Matches Cytoscape Desktop limitations
- Keeps property name generation manageable

**Impact**: Users must aggregate data if they need more than 16 categories.

### Equal Distribution for Zero Totals

**Decision**: When all data values sum to zero, slices are distributed equally rather than showing empty or error states.

**Rationale**:

- Prevents invalid CSS values (`NaN%`, `Infinity%`) that break rendering
- Provides a predictable visual state when data is missing
- Allows charts to render even with incomplete data

**Alternative Considered**: Showing all slices as 0% or hiding the chart entirely, but equal distribution provides better visual feedback.

### Reversed Color/Column Order

**Decision**: Colors and data columns are reversed before generating slice properties.

**Rationale**:

- Cytoscape.js renders pie slices from the bottom, counter-clockwise
- The view model stores data in a different order
- Reversing ensures visual consistency between configuration and rendering

**Impact**: Users must be aware that the first color in the palette corresponds to the last data column in the slice order.

### 4px Padding

**Decision**: Chart size is reduced by 4px from the minimum of width/height.

**Rationale**:

- Matches Cytoscape Desktop behavior for visual consistency
- Prevents charts from touching node borders
- Improves visual clarity

### Property Name Generation

**Decision**: Property names are generated using helper functions that map slice indices to `SpecialPropertyName` constants.

**Rationale**:

- Centralizes property name logic
- Ensures consistency across the codebase
- Allows graceful fallback for invalid indices
- Makes it easier to extend or modify property naming

### Visual Property Filtering

**Decision**: Custom graphics visual properties are identified by the `nodeImageChart` prefix and sorted alphabetically.

**Rationale**:

- Simple prefix matching is reliable and performant
- Sorting ensures consistent ordering when multiple custom graphics exist
- Keeps the selection logic straightforward

### Bypass and Mapping Priority

**Decision**: Size properties respect bypass values first, then mappings, then defaults.

**Rationale**:

- Bypasses are the most specific (element-level overrides)
- Mappings provide data-driven values
- Defaults are the fallback
- This priority matches standard visual property behavior

**Current Limitation**: Only default values and bypasses are fully validated for custom graphics. Mapping support may be added in the future.

### Angle Format Conversion

**Decision**: Angles are converted from view model format to Cytoscape.js format rather than storing both.

**Rationale**:

- Single source of truth for angle values
- Conversion is straightforward and reliable
- Keeps the view model format intuitive (0° = top)

## Edge Cases

### All Zero Values

**Behavior**: When all data column values are zero, slices are distributed equally.

**Example**: 3 slices with all zeros → each slice gets 33.33%

**Rationale**: Prevents division by zero errors and provides predictable rendering.

### Missing Attributes

**Behavior**: Missing attributes in row data are treated as zero.

**Example**: Chart configured for columns `[col1, col2, col3]` but row only has `col1` → `col2` and `col3` are treated as 0

**Impact**: Charts can render with incomplete data, but slice percentages may not reflect user intent.

### Invalid Slice Indices

**Behavior**: Indices outside 1-16 range generate fallback property names and log warnings.

**Example**: Index 17 → generates `pie17BackgroundColor` (not a valid Cytoscape.js property)

**Impact**: Invalid properties are ignored by Cytoscape.js, but no errors are thrown.

### Empty Custom Graphics

**Behavior**: Custom graphics with `None` type are selected as fallback when no valid graphics exist.

**Rationale**: Allows the system to have a valid custom graphic slot even when not configured.

## Integration Points

### Cytoscape.js Rendering

The computed property tuples are consumed by `cyjsRenderUtil.ts`, which applies them to Cytoscape.js element styles. Property names must match `SpecialPropertyName` constants for proper mapping.

### Vizmapper UI

The `CustomGraphicPicker` and `CustomGraphicDialog` components use these functions to:

- Validate custom graphics configurations
- Compute preview properties for the wizard
- Apply changes to visual styles

### Visual Property System

Custom graphics integrate with the standard visual property system:

- Default values are stored in visual properties
- Bypass values override defaults per element
- Size properties are managed separately but follow the same patterns

## Future Enhancements

1. **Image Properties**: The `computeImageProperties` function is currently a stub. Future implementation should handle image URL, size, and positioning.

2. **Mapping Support**: Currently only default values and bypasses are fully validated. Mapping functions for custom graphics could be added to enable data-driven chart configurations.

3. **Additional Chart Types**: Support for other chart types (bar charts, line charts, etc.) could be added following the same computation pattern.

4. **Dynamic Slice Limits**: The 16-slice limit could be made configurable or removed with dynamic property generation.

## Related Files

- **Type Definitions**: `src/models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType.ts`
- **Cytoscape.js Conversion**: `src/models/VisualStyleModel/impl/cyJsVisualPropertyConverter.ts`
- **Rendering**: `src/features/NetworkPanel/CyjsRenderer/cyjsRenderUtil.ts`
- **UI Components**: `src/features/Vizmapper/VisualPropertyRender/CustomGraphics/`
- **Special Properties**: `src/models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/directMappingSelector.ts`
