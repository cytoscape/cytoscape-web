# Dialog Dismissal Policy

> Which dialogs close on a backdrop click, which close on <kbd>Esc</kbd>, and why.
> Origin: [#628](https://github.com/cytoscape/cytoscape-web/issues/628).

## Policy Statement

**Every modal `<Dialog>` in `src/` MUST be rendered through `CyDialog`
(`src/components/CyDialog.tsx`) and MUST declare a `dismiss` tier.**

Direct `Dialog` imports from `@mui/material` are blocked by lint.

## The three tiers

| Tier          | Backdrop click | <kbd>Esc</kbd> | Use when                                                                                |
| ------------- | -------------- | -------------- | --------------------------------------------------------------------------------------- |
| `lightweight` | dismisses      | dismisses      | The dialog holds no user-entered state, or only state that costs nothing to rebuild.    |
| `form`        | ignored        | dismisses      | The dialog holds typed or multi-step state that reopening does not restore.             |
| `blocking`    | ignored        | ignored        | Dismissal is not a valid outcome — an in-progress task, or a gate the user must answer. |

### Choosing a tier

Ask one question: **if this dialog vanished right now, what would the user have to redo?**

- Nothing, or one click — `lightweight`. Read-only panels (About, License, Citations), confirms,
  list selection, previews, file dropzones.
- Typing, or steps through a wizard — `form`. Merge, Custom Graphics, the table-loader wizards,
  column forms, service-app run dialogs, layout options, export options.
- The question itself must be answered — `blocking`. See the exemption list below.

<kbd>Esc</kbd> stays live on `form` because it is deliberate; a backdrop click is the one people
hit by accident, reaching for a field near the edge or refocusing the window.

### Dismissal means cancel

For `lightweight` and `form`, `onClose` MUST run exactly what the Cancel / Close button runs —
never the Confirm path. A dialog whose dismissal writes data, grants consent, or applies a change
is a bug, not a tier choice.

## Usage

```tsx
import { CyDialog } from '@/components/CyDialog'

return (
  <CyDialog
    data-testid="my-dialog"
    open={open}
    dismiss="form"
    onClose={handleCancel}
    maxWidth="sm"
    fullWidth
  >
    <DialogTitle>…</DialogTitle>
  </CyDialog>
)
```

`dismiss` is required and has no default, so the tier is visible in every review. All other
`DialogProps` forward untouched. For `blocking`, omit `onClose` — it is never called.

## Blocking exemptions

These are the only dialogs permitted to refuse both dismiss paths. Each supplies its own exit
control. Adding to this list needs a note here saying why.

| Dialog                            | Why                                                                |
| --------------------------------- | ------------------------------------------------------------------ |
| `AppManager/TaskStatusDialog.tsx` | A remote service call is in flight; Cancel is the only valid exit. |
| `EmailVerification.tsx`           | Account gate — `open` is hard-coded true until the user verifies.  |

## Why a wrapper is required

MUI decides both dismiss paths from a single switch: pass `onClose` and backdrop click _and_
<kbd>Esc</kbd> close the dialog; omit it and neither does. `CyDialog` filters on the `reason`
argument MUI supplies (`'backdropClick'` | `'escapeKeyDown'`), which is what makes "Esc yes,
backdrop no" expressible at all.

Two guards that look like they work and do not — do not reintroduce them:

- `onKeyDown={(e) => e.stopPropagation()}` on a `<Dialog>` does **not** block <kbd>Esc</kbd>.
  `@mui/material/Modal/useModal.js` runs the user handler first, then its own escape logic
  regardless; its source comment states it "doesn't take `event.defaultPrevented` into account."
- `onClick={(e) => e.stopPropagation()}` on a `<Dialog>` does **not** block a backdrop click.
  `@mui/material/Dialog/Dialog.js` calls the user `onClick`, then fires
  `onClose(event, 'backdropClick')` regardless.

`disableEscapeKeyDown={false}` is also the default and does nothing. `CyDialog` sets the real one.

## Out of scope

- **Anchored, non-modal `<Menu>` / `<Popover>` surfaces** — context menus, palette pickers,
  mapping-form popovers, nested toolbar menus. Click-away dismissal is correct for menus; see
  `PopupPanel_docs/PopupPanel.md` and `EditMenu_docs/EditMenu.md`.
- **The two modal form popovers from PR #249** — `Vizmapper/Forms/VisualPropertyValueForm.tsx`
  and `SummaryPanel/NetworkPropertyEditor.tsx`. They use `disableEscapeKeyDown` + `hideBackdrop`
  so a visual property is committed only through confirm/cancel, which keeps undo entries whole
  (`Vizmapper/Forms/Forms_docs/Forms.md`). Changing them means revisiting that rationale.

## Tests

- `src/components/CyDialog.spec.tsx` — pins `shouldDismiss` over all six tier × reason pairs, and
  asserts the rendered behavior for backdrop click and <kbd>Esc</kbd> at each tier.
- `test/playwright/dialog-dismiss.spec.ts` — table-driven over representative dialogs; add a row
  when adding a dialog.
- `.oxlintrc.json` — `no-restricted-imports` keeps new call sites off `@mui/material`'s `Dialog`.
