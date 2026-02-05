# Vizmapper Feature

## Overview

The Vizmapper feature provides a visual style editor for customizing the appearance of network elements (nodes, edges, and network-level properties). It allows users to set default values, create data-driven mappings, and define bypass rules for visual properties. The interface is organized into three tabs: Nodes, Edges, and Network.

## Architecture

The Vizmapper is organized around visual properties, which are grouped into three categories:
- **Node Visual Properties**: Control node appearance (size, color, shape, border, etc.)
- **Edge Visual Properties**: Control edge appearance (width, color, style, arrows, etc.)
- **Network Visual Properties**: Control network-level appearance (background color, etc.)

## Component Structure

### Main Component
- **index.tsx**: The main Vizmapper component
  - Manages tab state (Nodes/Edges/Network)
  - Renders visual property views for each category
  - Handles custom graphics support

### Visual Property View
- **VisualPropertyView**: Individual visual property editor
  - Displays three forms: Default Value, Mapping, and Bypass
  - Handles disabled states (e.g., when node size is locked)
  - Shows tooltips for disabled properties

### Form Components
- **DefaultValueForm**: Sets the default value for a visual property
  - Supports different input types based on property value type
  - Color pickers for color properties
  - Number inputs for size properties
  - Dropdowns for discrete properties (e.g., node shape)

- **MappingForm**: Creates data-driven mappings
  - **Passthrough**: Direct mapping from table column to visual property
  - **Discrete**: Maps discrete values (e.g., node types) to visual values
  - **Continuous**: Maps continuous values (e.g., expression levels) to visual scales
  - Supports attribute selection and mapping configuration

- **BypassForm**: Defines exception rules
  - Allows overriding default/mapped values for specific elements
  - Supports selection-based bypasses
  - Can target specific node/edge IDs

### Supporting Components
- **VisualStyleIcons.tsx**: Icons for different mapping function types
- **VisualPropertyRender/**: Components for rendering visual property controls
- **Forms/VisualPropertyViewBox.tsx**: Container components for form sections

## Behavior

### Visual Property Editing
- Each visual property has three editing modes:
  1. **Default Value**: The base value applied to all elements
  2. **Mapping**: Data-driven mapping from table columns to visual values
  3. **Bypass**: Exception rules that override defaults/mappings

### Mapping Functions
- **Passthrough**: Directly uses table column values as visual property values
- **Discrete Mapping**: Maps specific table values to specific visual values (e.g., "Type A" → red, "Type B" → blue)
- **Continuous Mapping**: Maps numeric ranges to visual scales (e.g., expression 0-100 → color gradient)

### Custom Graphics
- Supports custom node graphics (images, charts) with associated size properties
- Only the first valid custom graphic is displayed in the editor
- Custom graphics require special handling for size properties

### Disabled States
- Some properties can be disabled based on other settings:
  - Node width disabled when node size is locked
  - Arrow colors disabled when "Edge color to arrows" is enabled
- Disabled properties show tooltips explaining why they're disabled

### Integration Points

- **VisualStyleStore**: Reads and writes visual style data
- **TableStore**: Accesses table columns for mapping
- **UiStateStore**: Manages visual editor properties (locks, preferences)
- **UndoStore**: Tracks style changes for undo/redo

## Design Decisions

### Three-Form Layout
- The Default/Mapping/Bypass layout provides clear separation of concerns
- Users can combine all three approaches for complex styling
- The horizontal layout with rotated labels saves vertical space

### Mapping Function Types
- Passthrough, Discrete, and Continuous cover most use cases
- Each type has specific UI optimized for its use case
- Type selection is based on data type compatibility

### Custom Graphics Support
- Custom graphics are handled separately from standard properties
- Only one custom graphic is shown at a time to avoid UI clutter
- Size properties for custom graphics are automatically managed

### Disabled Property Handling
- Disabled properties show empty boxes instead of hiding completely
- Tooltips explain why properties are disabled
- This prevents confusion about missing functionality

## Future Improvements

- Add preset visual styles (themes)
- Support for gradient mappings with multiple stops
- Visual preview of mapping functions
- Export/import visual style configurations
- Support for animation properties
- Custom property definitions

