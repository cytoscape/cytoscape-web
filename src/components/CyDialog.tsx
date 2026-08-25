import Dialog, { DialogProps } from '@mui/material/Dialog'

/**
 * How much a dialog resists being dismissed. See
 * `docs/specifications/DIALOG_DISMISS_POLICY.md` for the rule that decides
 * which tier a dialog belongs to.
 *
 * - `lightweight` — backdrop click and Escape both dismiss.
 * - `form` — Escape dismisses, backdrop click does not.
 * - `blocking` — neither dismisses; the dialog must supply its own exit.
 */
export type DialogDismiss = 'lightweight' | 'form' | 'blocking'

/** The two dismissal reasons MUI reports through `onClose`. */
export type DialogCloseReason = 'backdropClick' | 'escapeKeyDown'

/**
 * The whole policy, as a pure function. `CyDialog` is the only caller; it is
 * exported so the unit test can pin every tier/reason pair directly.
 */
export const shouldDismiss = (
  dismiss: DialogDismiss,
  reason: DialogCloseReason,
): boolean =>
  dismiss === 'lightweight' ||
  (dismiss === 'form' && reason === 'escapeKeyDown')

export interface CyDialogProps extends Omit<DialogProps, 'onClose'> {
  /** Required, and deliberately has no default: state the tier at every site. */
  dismiss: DialogDismiss
  /**
   * The cancel path — dismissal must do exactly what the Cancel/Close button
   * does, never what Confirm does. Omit only for `blocking`, which never calls
   * it.
   */
  onClose?: () => void
}

/**
 * `Dialog` with a declared dismissal tier.
 *
 * MUI decides both dismiss paths from one switch: pass `onClose` and backdrop
 * click *and* Escape close the dialog; omit it and neither does. Nothing
 * filters the `reason` argument, so "Escape yes, backdrop no" was previously
 * unreachable. This wrapper filters on `reason`, which is what makes the tiered
 * policy expressible.
 *
 * Note that `stopPropagation()` on a `<Dialog>`'s own `onClick`/`onKeyDown` does
 * not block either path — MUI runs the user handler first and dismisses anyway
 * (`Dialog.js` `handleBackdropClick`, `Modal/useModal.js` `createHandleKeyDown`).
 * Set the tier here instead.
 */
export const CyDialog = (props: CyDialogProps): JSX.Element => {
  const { dismiss, onClose, children, ...dialogProps } = props

  return (
    <Dialog
      {...dialogProps}
      // After the spread on purpose: the tier wins over anything a call site
      // passes through.
      onClose={
        dismiss === 'blocking'
          ? undefined
          : (_event, reason) => {
              if (shouldDismiss(dismiss, reason)) {
                onClose?.()
              }
            }
      }
      disableEscapeKeyDown={dismiss === 'blocking'}
    >
      {children}
    </Dialog>
  )
}
