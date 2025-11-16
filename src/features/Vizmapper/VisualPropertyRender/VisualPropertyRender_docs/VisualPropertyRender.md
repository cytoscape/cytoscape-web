# Vizmapper VisualPropertyRender Feature

## Overview

`Vizmapper/VisualPropertyRender` contains the low-level editors and renderers for individual visual property value types. These components are embedded by `VisualPropertyValueForm` (and related forms) to present the correct UI for a value:

- Number, String, Boolean
- Color and Opacity
- Node Shape and Visibility
- Label alignment/position and edge arrow/line renderers

Each editor provides a small, focused UI that supports confirm/cancel and integrates with the store via higher-level forms.

## Components & Behavior

- **Number.tsx**
  - Numeric input with inline validation (`Integer`, `Double`, `Long`), clamped by VP `maxVal` where provided.
  - Optional "lock size" checkbox (ties node width/height) via `LockSizeCheckbox`.
  - Cancel resets local edits; Confirm commits sanitized numeric value.

- **String.tsx**
  - Simple text input; Cancel/Confirm flow.

- **Boolean.tsx**
  - Toggle switch for boolean VPs; Cancel restores previous value; Confirm commits.

- **Color.tsx**
  - Tabbed color picker: ColorBrewer Sequential/Diverging, Viridis, Swatches, Chrome color picker.
  - Local color state debounced before commit to reduce churn.
  - Cancel/Confirm flow.

- **Opacity.tsx**
  - Slider with labeled marks (0–100%), converted to 0.0–1.0 on commit.
  - Cancel/Confirm flow.

- **NodeShape.tsx**
  - Grid of supported node shapes; highlights selected shape; Cancel/Confirm flow.

- **Visibility.tsx**
  - Pick visibility enum for elements; provides visual icons and selection highlighting; Cancel/Confirm.

- **Edge/Label Helpers**
  - `EdgeArrowShape.tsx`, `EdgeLine.tsx`, `Font.tsx`, `NodeLabelPosition.tsx`, `NodeBorderLine.tsx`, `HorizontalAlign.tsx`, `VerticalAlign.tsx` provide compact renderers/
    editors or value displays specialized for related VPs.

- **Shared Controls**
  - `CancelConfirmButtonGroup.tsx`: Standardized confirm/cancel button cluster.
  - `Checkbox.tsx`: Shared checkboxes (e.g. lock node size, arrow color matches edge) connected to UI and workspace stores.

## Integration & Data Flow

- These components do not write to the stores directly.
- They expose `onValueChange` and `closePopover(reason)` to parent forms (`VisualPropertyValueForm`, mapping forms).
- Parent forms handle store updates (`VisualStyleStore`) and undo recording (`UndoStore`).

## Design Decisions

- **Focused, Composable Editors**
  - Each file handles one value type; parent forms compose them into full workflows.

- **Debounced Color Editing**
  - Color editors debounce local changes to avoid overwhelming store updates or expensive re-renders.

- **Accessibility & Testing**
  - Editors include `data-testid` attributes for Playwright tests.
  - ARIA-friendly components (e.g., tabs/buttons) follow Material-UI norms.

## Future Improvements

- Add keyboard navigation hints to tabbed color picker.
- Provide mini previews for complex VPs (e.g., label position overlays).
- Add optional live preview mode that commits on change with throttling.
