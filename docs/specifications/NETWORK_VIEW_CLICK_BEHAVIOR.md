# Network View Click Activation Behavior

## Summary

When a renderer viewport inside `NetworkPanel` is inactive, the **first click** anywhere within that renderer must only activate the panel. Renderer-specific click handlers may run **only after** the view becomes active.

## Rationale

- Prevents accidental actions (e.g., clearing selections in `CirclePackingPanel`) when switching between renderer views.
- Aligns the user experience with the tab metaphor: select the view first, then interact with its contents.

## Expected Behavior

| Scenario | Expected Result |
| --- | --- |
| Click inside an inactive renderer (background, canvas, toolbar, etc.) | Network view becomes the active renderer; renderer-level click handlers are **not** invoked. |
| Click inside an already active renderer | The renderer receives the event and executes its own click logic. |

## Implementation Notes

- `NetworkPanel` passes `handleClick` to `NetworkTab` to set the active network view.
- `NetworkTab` uses an `onClickCapture` handler to intercept clicks when `isActive === false`, call `handleClick`, and stop propagation. This prevents downstream handlers (e.g., D3 click handlers in `CirclePackingPanel`) from firing during activation.
- Once active, events flow normally through the renderer.

## QA Checklist

- [ ] Clicking an inactive renderer highlights its tab/outline without triggering renderer-side behavior.
- [ ] Subsequent clicks on the active renderer perform renderer-specific actions (e.g., selection clearing in `CirclePackingPanel`).
- [ ] Tab switching via other UI controls (if any) keeps this contract intact.


