import Dialog, { DialogProps } from '@mui/material/Dialog'

/**
 * `Dialog` that can only be closed through one of its own buttons.
 *
 * Backdrop click and Escape are both inert. See
 * `docs/specifications/DIALOG_DISMISS_POLICY.md` for the rule and its one
 * hard requirement: **every dialog must offer a visible control that closes
 * it**, because nothing else will get the user out. A Submit button does not
 * count — it commits rather than leaves.
 *
 * MUI decides both dismiss paths from one switch — pass `onClose` and backdrop
 * click *and* Escape close the dialog; omit it and neither does. `onClose` is
 * therefore removed from the prop type: passing one is a type error, and the
 * handler belongs on a button instead. `disableEscapeKeyDown` is removed for the
 * same reason — it is always true here, and a call site must not be able to
 * argue with that.
 *
 * Note that `stopPropagation()` on a `<Dialog>`'s own `onClick`/`onKeyDown`
 * does not block either path — MUI runs the user handler first and dismisses
 * anyway (`Dialog.js` `handleBackdropClick`, `Modal/useModal.js`
 * `createHandleKeyDown`). This wrapper is the only thing that does.
 */
export type CyDialogProps = Omit<
  DialogProps,
  'onClose' | 'disableEscapeKeyDown'
>

export const CyDialog = (props: CyDialogProps): JSX.Element => {
  const { children, ...dialogProps } = props

  return (
    <Dialog
      {...dialogProps}
      // After the spread on purpose, so the policy holds even if a call site
      // spreads a props object past the type check.
      onClose={undefined}
      disableEscapeKeyDown
    >
      {children}
    </Dialog>
  )
}
