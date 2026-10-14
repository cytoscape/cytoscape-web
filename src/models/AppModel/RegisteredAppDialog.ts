// src/models/AppModel/RegisteredAppDialog.ts
//
// Internal model for a dialog opened by an app via apis.dialog.open().
// Stored in AppDialogStore. `render` is typed `unknown` to keep the model
// layer free of React imports, same convention as `component` on
// RegisteredAppResource.
//
// Unlike an 'apps-menu' entry, a dialog body IS app-supplied React — but it
// renders in its own modal layer, inside chrome the host owns (title bar,
// Close "X", padding), never inline in a shared surface. That isolation is
// what makes a real component safe here.

export interface RegisteredAppDialog {
  readonly id: string
  readonly appId: string
  /** Shown in the host-rendered title bar. */
  readonly title: string
  /**
   * (props: { close: () => void }) => ReactNode — kept opaque here; the
   * host casts to the real signature when rendering in AppDialogHost.
   */
  readonly render: unknown
  // Plain literals rather than MUI's Breakpoint type: the model layer stays
  // MUI-free. The host's dialog shell forwards them to CyDialog.
  /** Maximum dialog width. Defaults to 'sm' when undefined. */
  readonly maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  /** Stretch the dialog to `maxWidth`. Defaults to false when undefined. */
  readonly fullWidth?: boolean
}
