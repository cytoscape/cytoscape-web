# LayoutTools Feature

## Overview

The LayoutTools feature provides manual layout manipulation capabilities for network visualizations. It allows users to scale node positions along width, height, or both dimensions using an intuitive slider interface. This is particularly useful for fine-tuning network layouts after automatic layout algorithms have been applied.

## Architecture

The LayoutTools follows a **simple component composition pattern** where:

- **FloatingLayoutToolsPanel** is the movable floating window in the network view that hosts the tools
- **layoutToolsPanelStore** holds whether that window is open; the Layout menu toggles it
- **LayoutToolsPanel** manages network ID resolution and renders the scaling component
- **Scaling** is the main component that handles scaling logic and UI
- **ScalingTypeSelector** provides radio buttons for selecting scaling dimension

## Component Structure

```
LayoutTools/
├── FloatingLayoutToolsPanel.tsx  # Movable floating window in the network view
├── FloatingLayoutToolsPanel.spec.tsx # Floating window and drag tests
├── LayoutToolsPanel.tsx           # Main panel with network ID resolution
├── Scaling.tsx                    # Main scaling component
├── Scaling.spec.tsx               # Scaling component tests
├── ScalingTypeSelector.tsx        # Scaling dimension selector
├── scalingUtil.ts                 # Scale factor, marks, anchor, snapping and slider-state inference
├── scalingUtil.test.ts            # Helper tests
├── store/layoutToolsPanelStore.ts # Open/closed state of the floating window
└── index.tsx                       # Public exports
```

## Components

### FloatingLayoutToolsPanel

The only place the layout tools appear (#887 removed the collapsible section
that used to sit below the workspace list). `NetworkTab` renders it over the
network view.

**Behavior:**

- Hidden by default; **Layout → Layout Tools** toggles it through `layoutToolsPanelStore`, and the close button in its title bar hides it
- Opens in the lower-left corner of the network view
- Moves when its title bar is dragged, and cannot be dragged out of the network view; the close button does not start a drag
- Is placed against `NetworkTab`'s box (`position: relative`), so in a hierarchy it cannot be dragged over the TREE VIEW / CELL VIEW tabs
- Forgets where it was moved when closed: it unmounts, so reopening it brings it back to the lower-left corner, which also recovers a panel left out of view after the canvas shrank
- Renders LayoutToolsPanel below the title bar

The drag goes through `PointerDraggable` (`src/components/PointerDraggable.tsx`,
#901), which wraps react-draggable's `DraggableCore` and computes the offset
from the pointer's travel since the press. The panel passes `dragLimits` as
its bounds: measured from the network view at each press, so a resized canvas
applies from the next drag, and no drag starts while the panel has no offset
parent. `<Draggable>` is not used because it adds each move to its last
*committed* position: React 18 commits mouse-move updates in
a later task, so a move that arrives before the commit is lost and the panel
falls behind the pointer (reproducible in WebKit, and under main-thread load
in any browser). The unit test "keeps every move when React commits several
at once" guards this.

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
- Keeps the slider truthful whenever node positions change: it shows the value that produced the positions, or x1.0 when no value does (#896)

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
- **Truthful Slider (#896)**: Whenever the node positions change, `inferSliderState` (`scalingUtil.ts`) looks for the slider state that explains them: every node at its original position scaled about the anchor by a slider value, in Width, Height or Both mode. The current state is tried first; otherwise one factor per axis is read off the node farthest from the anchor on that axis, rounded to the slider step, and each mode is checked against every node, stopping at the first that does not fit. The factor is only a guess the check confirms, so any nonzero distance works, including in a layout under one unit across; the search stops early once a node at least one unit away has been seen on both x and y. z, which scales by the slider's factor in every mode, stands in when no node is off the anchor in x or y.
  - **Explained** (the slider's own write; undo or redo of any number of scales; another `Scaling` on the same network, such as two split-view panels or the manual's demo): the slider and the mode are set to that state. The original positions and the anchor stay, so x1.0 still restores the original layout. A redone Width scale switches the mode to Width even if Both was selected since.
  - **Not explained** (a drag, even of one node; a layout; an App API move; a node with no original position, including one restored by undoing a delete; a newly loaded view): the positions on screen become the new original positions, the anchor moves to their center, and the slider goes to x1.0. Nodes never move: only what the slider shows changes.
  - With no nodes the slider shows x1.0.
  - **Nothing moved**: the store replaces `nodeViews` for writes that move no node, such as `updateNodePositions` with the current coordinates. `samePositions` compares the new record with the last one the effect read (held by reference; the store never mutates it) and skips the check, so a mode picked since the last scale is kept. Without this, picking Width at Both x10 and then such a write switched the mode back to Both, and the next commit scaled both axes.
  - Before #896 the slider kept its value and every moved node was back-computed to the original position it would have at that scale. After **Edit → Undo** of x10 the slider still read x10, the back-computed baseline was a tenth of the real layout, and x1.0 then shrank the network to a tenth about its center.
  - Cost: one pass over the nodes in the common cases, about 2.5 ms for 20,000 nodes (a unit test catches a gross slowdown). The node ids are listed once with `Object.keys`, because a `for...in` over that many keys lists them all again every time it starts, even when it stops at the first node.
- **Anchor**: The anchor stays fixed while the slider is off x1.0, and follows the layout's center at x1.0. Deleted nodes are dropped from the original positions, so neither the anchor nor the next scale counts them. The original positions are a ref, not state: nothing renders them, and the sync effect must see a rebase at once
- **Undo Support**: All scaling operations are undoable. The undo entry's previous positions include z, so undo restores z along with x and y
- **Nothing to Scale**: When the network has no nodes, or its view is not loaded yet, the Width/Height/Both radios, the slider and the reset button are disabled. `applyScaling` also returns before raising the layout store's `isRunning` flag when it has no original positions (they can lag the view by a render), so it never records an empty undo entry or leaves "Applying layout..." on screen (#880)
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

2. **Positions, Not Commands, Drive the Slider**: The slider reads its state off the node positions (see Truthful Slider above) instead of carrying its value in the undo entry. Every source of position changes (undo, redo, another slider, a drag, a layout) goes through the one check, and the undo entry stays a plain `APPLY_LAYOUT` of positions like every other layout's.

3. **Network Switch**: Switching networks clears the original positions and resets the slider. The sync effect, declared after that reset, then finds no original positions for the new network's nodes and reads its positions as x1.0. A view that loads later does the same when it arrives.

4. **Slider-Based Interface**: Uses a slider with visual marks for intuitive scale factor selection. The logarithmic-like scale (0.1x to 10x) covers a wide range of scaling needs.

5. **Three Scaling Modes**: Provides width-only, height-only, and both-dimensions scaling to give users fine-grained control over layout adjustments.

6. **Undo Integration**: All scaling operations create undo commands, allowing users to revert scaling changes easily.

7. **Reset Functionality**: Provides a reset button that restores current positions as the new baseline and resets the slider, giving users a way to "commit" their scaling changes.

8. **Real-Time Updates**: Updates node positions in real-time as the slider is moved, providing immediate visual feedback.

## Data Flow

1. **Network Detection**: LayoutToolsPanel resolves target network ID
2. **Position Initialization**: Scaling component captures original node positions when network view is ready, and re-reads the slider state from the positions on every later change
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
