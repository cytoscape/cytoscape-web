# LayoutTools Feature

## Overview

The LayoutTools feature provides manual layout manipulation capabilities for network visualizations. It allows users to scale node positions along width, height, or both dimensions using an intuitive slider interface. This is particularly useful for fine-tuning network layouts after automatic layout algorithms have been applied.

## Architecture

The LayoutTools follows a **simple component composition pattern** where:

- **LayoutToolsBasePanel** provides an accordion wrapper for collapsible UI
- **LayoutToolsPanel** manages network ID resolution and renders the scaling component
- **Scaling** is the main component that handles scaling logic and UI
- **ScalingTypeSelector** provides radio buttons for selecting scaling dimension

## Component Structure

```
LayoutTools/
├── LayoutToolsBasePanel.tsx      # Accordion wrapper component
├── LayoutToolsPanel.tsx           # Main panel with network ID resolution
├── Scaling.tsx                    # Main scaling component
├── Scaling.spec.tsx               # Scaling component tests
├── ScalingTypeSelector.tsx        # Scaling dimension selector
├── scalingUtil.ts                 # Scale factor, marks, anchor and snapping helpers
├── scalingUtil.test.ts            # Helper tests
└── index.tsx                       # Public exports
```

## Components

### LayoutToolsBasePanel

An accordion wrapper that provides a collapsible container for the layout tools.

**Behavior:**

- Provides expandable/collapsible UI using Material-UI Accordion
- Maintains consistent height when expanded or collapsed
- Renders LayoutToolsPanel in the accordion details

### LayoutToolsPanel

The main panel component that resolves the target network ID and renders the scaling component.

**Behavior:**

- Resolves target network ID from active network view or current network
- Uses active network view if available, otherwise falls back to current network
- Renders the Scaling component with the resolved network ID

### Scaling

The core component that provides scaling functionality for node positions.

**Behavior:**

- Maintains original node positions as a baseline for scaling operations
- Provides a slider interface for adjusting scale factor (range: -9 to 9)
- Supports three scaling modes: width only, height only, or both dimensions
- Updates node positions in real-time as slider is adjusted
- Provides reset functionality to restore original positions
- Creates undo commands for scaling operations
- Tracks initialization state to prevent position confusion when networks switch
- Automatically updates original positions when external components modify node positions

**Key Features:**

- **Slider Range**: -9 to 9, with marks at -9 (x0.1), -5 (x0.5), 0 (x1.0), 4 (x5), 9 (x10)
- **Centered Scaling**: Positions scale about the center of the original positions' bounding box (`anchor + (position - anchor) * scale`), not about the coordinate origin, so the network stays where it is on screen. Scaling about the origin moved a centered network toward the top-left; scaled up, it could leave the view entirely, and the renderer's off-screen recovery (`cy.fit()`) then changed the zoom, so returning to x1.0 restored the positions but not the view (#890)
- **Exact x1.0**: A factor of 1 returns each coordinate untouched, so x1.0 restores the original layout exactly
- **Mark Snapping**: Mouse and touch input within 0.3 slider units (about three pixels) of a mark snaps onto it; the keyboard's arrow keys still step through every value. One step (0.1) is about a pixel, so a click aimed at x1.0 used to land on x0.99 or x1.1
- **Value Label**: Shows up to two decimals (x0.99, x1.1), so a value just off a mark never reads as the mark
- **Scaling Modes**:
  - Width: Scales only X coordinates
  - Height: Scales only Y coordinates
  - Both: Scales both X and Y coordinates
- **Position Tracking**: Maintains original positions and adjusts them when external changes occur. A node the slider placed is recognized by recomputing its scaled position exactly, so it keeps its original position; a node moved by something else gets the original position it stands for at the current scale, about the same anchor. The anchor stays fixed while the slider is off x1.0, and follows the layout's center at x1.0
- **Undo Support**: All scaling operations are undoable
- **Reset Function**: Restores positions to current state and resets slider to center

**Scaling Calculation:**

The slider value is converted to a scaling factor using the formula:
- Negative values: `scale = (10 - |value|) / 10` (e.g., -9 → 0.1, -5 → 0.5, -4 → 0.6)
- Positive values: `scale = value + 1.0` (e.g., 0 → 1.0, 4 → 5.0, 9 → 10.0)

The marks live in `SCALING_MARKS` (`scalingUtil.ts`), and a unit test checks that every mark's label is the factor `calcScale` gives at its value. The x0.5 mark sat at -4, which scales by 0.6 (#879).

### ScalingTypeSelector

A radio button group for selecting the scaling dimension.

**Behavior:**

- Provides three options: Width, Height, Both
- Updates scaling type state when selection changes
- Displays current selection

## Integration Points

The LayoutTools components integrate with the following stores and services:

- **ViewModelStore** - Node positions and network views
- **LayoutStore** - Layout running state
- **UndoStore** - Undo/redo functionality for scaling operations
- **WorkspaceStore** - Current network ID
- **UiStateStore** - Active network view

## Design Decisions

1. **Original Position Tracking**: Maintains a snapshot of original positions to enable relative scaling. This allows users to scale from a known baseline rather than accumulating scaling operations. The positions scale about the center of that baseline's bounding box, captured with it (see Centered Scaling above).

2. **External Position Updates**: Automatically adjusts original positions when external components (e.g., layout algorithms) modify node positions. This prevents position drift and maintains scaling accuracy.

3. **Initialization Guard**: Uses a ref-based initialization flag to prevent position confusion when networks are switched. This ensures original positions are only captured once per network.

4. **Slider-Based Interface**: Uses a slider with visual marks for intuitive scale factor selection. The logarithmic-like scale (0.1x to 10x) covers a wide range of scaling needs.

5. **Three Scaling Modes**: Provides width-only, height-only, and both-dimensions scaling to give users fine-grained control over layout adjustments.

6. **Undo Integration**: All scaling operations create undo commands, allowing users to revert scaling changes easily.

7. **Reset Functionality**: Provides a reset button that restores current positions as the new baseline and resets the slider, giving users a way to "commit" their scaling changes.

8. **Real-Time Updates**: Updates node positions in real-time as the slider is moved, providing immediate visual feedback.

## Data Flow

1. **Network Detection**: LayoutToolsPanel resolves target network ID
2. **Position Initialization**: Scaling component captures original node positions when network view is ready
3. **User Interaction**: User adjusts slider or changes scaling type
4. **Scale Calculation**: Slider value is converted to scaling factor
5. **Position Update**: Node positions are calculated based on original positions and scaling factor
6. **Store Update**: Updated positions are written to ViewModelStore
7. **Undo Command**: Scaling operation is recorded in UndoStore
8. **Visual Update**: Network visualization reflects new positions

## Future Improvements

1. **Preset Scales**: Add preset scale buttons for common values (0.5x, 2x, etc.)
2. **Keyboard Shortcuts**: Add keyboard shortcuts for common scaling operations
3. **Scale Input Field**: Add numeric input field for precise scale factor entry
4. **Selection-Based Scaling**: Allow scaling only selected nodes
5. **Animation**: Add smooth transitions when scaling
6. **Scale History**: Maintain history of scale factors for quick reapplication
7. **Export Scale**: Allow exporting/importing scale configurations

