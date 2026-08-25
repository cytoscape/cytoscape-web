# Dialog Dismissal Policy

> How modal surfaces close, and the one thing every modal must therefore provide.
> Origin: [#628](https://github.com/cytoscape/cytoscape-web/issues/628).

## Policy Statement

**A modal closes through one of its own buttons and nothing else.** Backdrop click and
<kbd>Esc</kbd> are inert on every modal in the app.

**Every modal MUST offer a visible control that closes it**, reachable by keyboard. This is not a
style preference — it is the only exit, and a dialog without one traps the user.

Usually that control is labelled Cancel or Close. The label is not the requirement; leaving without
committing is. `WelcomeDialog`'s "Explore on my own" and `EmailVerification`'s "Log Out" both
qualify, and both read better than a generic Cancel would. A Submit or Confirm button does **not**
qualify — it commits rather than leaves.

Two mechanisms enforce this, one per surface type:

| Surface                | Mechanism                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `<Dialog>`             | Render through `CyDialog` (`src/components/CyDialog.tsx`). Direct `Dialog` imports from `@mui/material` are blocked by lint. |
| Modal form `<Popover>` | `disableEscapeKeyDown={true}` + `hideBackdrop={true}` on the popover.                                                        |

## Usage

```tsx
import { CyDialog } from '@/components/CyDialog'

return (
  <CyDialog data-testid="my-dialog" open={open} maxWidth="sm" fullWidth>
    <DialogTitle>…</DialogTitle>
    <DialogContent>…</DialogContent>
    <DialogActions>
      <Button onClick={handleCancel}>Cancel</Button>
      <Button onClick={handleConfirm} variant="contained">
        Save
      </Button>
    </DialogActions>
  </CyDialog>
)
```

`CyDialog` removes `onClose` from the prop type, so passing one is a type error. The handler
belongs on a button. Every other `DialogProps` forwards untouched.

## Which surfaces this covers

**All 40 `<Dialog>` sites**, through `CyDialog`.

**The four modal form popovers.** These are anchored but behave as modal editors, so they follow
the same rule through their own props:

| Popover                                       | Editing                     |
| --------------------------------------------- | --------------------------- |
| `Vizmapper/Forms/VisualPropertyValueForm.tsx` | a visual property's value   |
| `Vizmapper/Forms/MappingForm/index.tsx`       | a visual property's mapping |
| `Vizmapper/Forms/BypassForm.tsx`              | per-element bypasses        |
| `SummaryPanel/NetworkPropertyEditor.tsx`      | the network summary         |

`MappingForm` and `BypassForm` joined this list in the #628 sweep; before it they closed on
click-away and had no button of their own, which is exactly the inconsistency the policy exists to
remove. Both now carry a Close button.

**Out of scope: anchored, non-modal `<Menu>` / `<Popover>` surfaces** — context menus, palette
pickers, nested toolbar menus. Click-away dismissal is correct for a menu; see
`PopupPanel_docs/PopupPanel.md` and `EditMenu_docs/EditMenu.md`.

## Why a wrapper is required

MUI decides both dismiss paths from a single switch: pass `onClose` and backdrop click _and_
<kbd>Esc</kbd> close the dialog; omit it and neither does. Nothing filters the `reason` argument
MUI supplies, so the behaviour was previously whatever each author happened to pass.

Two guards that look like they work and do not — do not reintroduce them:

- `onKeyDown={(e) => e.stopPropagation()}` on a `<Dialog>` does **not** block <kbd>Esc</kbd>.
  `@mui/material/Modal/useModal.js` runs the user handler first, then its own escape logic
  regardless; its source comment states it "doesn't take `event.defaultPrevented` into account."
- `onClick={(e) => e.stopPropagation()}` on a `<Dialog>` does **not** block a backdrop click.
  `@mui/material/Dialog/Dialog.js` calls the user `onClick`, then fires
  `onClose(event, 'backdropClick')` regardless.

Worse, the `preventDefault()` some of those handlers paired with the `stopPropagation()` _did_
have an effect — a bubble-phase `preventDefault` on keydown suppresses text insertion, which is
why `LoadFromNdexDialog`'s search field carries a `stopPropagation()` of its own to escape it.

`disableEscapeKeyDown={false}` is also the default and does nothing. `CyDialog` sets the real one.

## What the rule costs

Stated plainly so it is a decision on record rather than an oversight:

- **Keyboard users lose the standard modal escape hatch.** <kbd>Esc</kbd> closing a dialog is a
  widely-held expectation and a WCAG-friendly default. Every dialog must therefore keep its Cancel
  or Close button reachable by keyboard.
- **Read-only dialogs pay the same tax as forms.** About, License and Citations could safely close
  on a stray click; under this policy they do not.

The gain is that dismissal is never ambiguous and never destructive: no click discards a
half-filled form, and no dialog closes into a state the user did not choose.

## Tests

- `src/components/CyDialog.spec.tsx` — asserts backdrop click and <kbd>Esc</kbd> leave the dialog
  open, and that the dialog's own buttons still fire.
- `src/components/dialogPolicy.test.ts` — asserts **every** `CyDialog` in `src/` holds a control
  whose label, `aria-label` or `data-testid` reads as a way out, and that the four form popovers
  keep both guard props. A Submit-only dialog fails. This is the check that keeps a dialog from
  shipping with no exit; it caught the service-app run dialog.
- `test/playwright/dialog-dismiss.spec.ts` — per dialog: <kbd>Esc</kbd> and a backdrop click leave
  it open, its button closes it. Add a row when adding a dialog.
- `.oxlintrc.json` — `no-restricted-imports` keeps new call sites off `@mui/material`'s `Dialog`.
