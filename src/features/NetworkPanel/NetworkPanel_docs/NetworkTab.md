# NetworkTab Component

## Overview

`NetworkTab` is responsible for rendering a single network view with a renderer component. It manages click handling to ensure proper activation behavior while allowing `FloatingToolBar` buttons to work independently.

## Summary

When a renderer viewport inside `NetworkPanel` is inactive, the **first click** anywhere within that renderer must only activate the panel. Renderer-specific click handlers may run **only after** the view becomes active. However, `FloatingToolBar` buttons always work independently, regardless of the renderer's active state.

## Architecture

The component uses a nested Box structure to isolate click handling:

```
<Box (outer container)>
  <Box (inner container with click handlers)>
    {rendererComponent}
  </Box>
  <FloatingToolBar /> (outside click handlers)
</Box>
```

- **Outer Box**: Container for styling and layout. No click handlers.
- **Inner Box**: Wraps the renderer component and contains `onClick` and `onClickCapture` handlers. This ensures renderer clicks are controlled while FloatingToolBar is unaffected.
- **FloatingToolBar**: Rendered as a sibling to the inner Box, outside the click handler scope, ensuring its buttons always work.

## Rationale

- Prevents accidental actions (e.g., clearing selections in `CirclePackingPanel`) when switching between renderer views.
- Aligns the user experience with the tab metaphor: select the view first, then interact with its contents.
- Ensures `FloatingToolBar` buttons remain functional even when the renderer is inactive, allowing users to perform toolbar actions without activating the renderer.

## Expected Behavior

| Scenario                                                     | Expected Result                                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Click inside an inactive renderer (background, canvas, etc.) | Network view becomes the active renderer; renderer-level click handlers are **not** invoked. |
| Click inside an already active renderer                      | The renderer receives the event and executes its own click logic.                            |
| Click on FloatingToolBar button (inactive renderer)          | Button action fires normally; renderer is **not** activated.                                 |
| Click on FloatingToolBar button (active renderer)            | Button action fires normally; renderer click handlers are **not** triggered.                 |

## Implementation Notes

### Click Handling

- `NetworkPanel` passes `handleClick` to `NetworkTab` to set the active network view.
- The **inner Box** (wrapping `rendererComponent`) uses `onClickCapture` and `onClick` handlers:
  - **`onClickCapture`**: Intercepts clicks during the capture phase when `isActive === false`, calls `handleClick`, and stops propagation. This prevents downstream handlers (e.g., D3 click handlers in `CirclePackingPanel`) from firing during activation.
  - **`onClick`**: When inactive, stops propagation and returns early. When active, allows normal event flow and calls `handleClick` idempotently.
- Once active, events flow normally through the renderer.
- **`FloatingToolBar`** is rendered outside the inner Box, so its buttons are never affected by the click handlers, ensuring they always work.

### Component Structure

```tsx
<Box> {/* Outer container */}
  <Box onClickCapture={...} onClick={...}> {/* Inner container with handlers */}
    {rendererComponent}
  </Box>
  <FloatingToolBar rendererId={renderer.id} /> {/* Sibling, no handlers */}
</Box>
```

## Testing

The component includes comprehensive tests in `NetworkTab.test.tsx` that verify:

1. **Renderer Click Behavior**:
   - Inactive renderer clicks activate the tab without triggering renderer handlers
   - Active renderer clicks trigger both activation and renderer handlers

2. **FloatingToolBar Click Behavior**:
   - FloatingToolBar buttons work when renderer is inactive
   - FloatingToolBar buttons work when renderer is active
   - FloatingToolBar clicks don't trigger renderer activation or handlers
   - Renderer clicks and FloatingToolBar clicks work independently

See `NetworkTab.test.tsx` for the full test suite.

## QA Checklist

- [ ] Clicking an inactive renderer highlights its tab/outline without triggering renderer-side behavior.
- [ ] Subsequent clicks on the active renderer perform renderer-specific actions (e.g., selection clearing in `CirclePackingPanel`).
- [ ] FloatingToolBar buttons work correctly when renderer is inactive.
- [ ] FloatingToolBar buttons work correctly when renderer is active.
- [ ] FloatingToolBar button clicks do not activate inactive renderers.
- [ ] FloatingToolBar button clicks do not trigger renderer click handlers.
- [ ] Tab switching via other UI controls (if any) keeps this contract intact.
