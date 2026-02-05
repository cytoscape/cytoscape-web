# PopupPanel Feature

## Overview

The PopupPanel feature provides a context-sensitive popup panel that displays information about graph objects (nodes, edges, subsystems) when clicked. It appears at the cursor position and shows relevant properties and metadata.

## Architecture

The PopupPanel feature consists of:
- **PopupPanel**: Main popup container
- **GraphObjectPropertyPanel**: Displays properties for graph objects

## Component Structure

### PopupPanel.tsx
- Fixed-position card that appears on click
- Positioned at cursor coordinates
- Auto-dismisses on click outside
- Scrollable content area
- Themed styling with rounded corners

### GraphObjectPropertyPanel.tsx
- Displays subsystem or graph object properties
- Shows object name/title
- Lists all properties as key-value pairs
- Simple typography-based layout

## Behavior

### Display Trigger
- Triggered by clicking on graph objects in network visualization
- Positioned at click coordinates
- Appears with smooth animation (if configured)

### Content Display
- Shows object name/title prominently
- Lists all properties in key-value format
- Properties are separated by dividers
- Scrollable if content exceeds panel size

### Dismissal
- Click outside panel dismisses it
- Click on panel content also dismisses (stops propagation)
- Can be programmatically closed

### Positioning
- Fixed position relative to viewport
- Appears near cursor/click location
- Constrained to viewport bounds
- Max height/width to prevent overflow

## Integration Points

- **Network Visualization**: Receives click events from renderers
- **ViewModelStore**: Accesses object properties
- **TableStore**: Accesses attribute data
- **UiStateStore**: Manages popup visibility state

## Design Decisions

### Fixed Positioning
- Appears at click location for context
- Doesn't interfere with main content
- Easy to dismiss

### Card-Based Design
- Clear visual separation from background
- Rounded corners for modern look
- Shadow for depth

### Auto-Dismiss
- Click-outside dismissal is intuitive
- Prevents UI clutter
- Doesn't require explicit close action

### Simple Property Display
- Key-value format is universal
- Easy to scan and read
- No complex formatting needed

## Future Improvements

- Rich property editing
- Property filtering/search
- Custom property display formats
- Multiple object comparison
- Property export
- Customizable panel size and position

