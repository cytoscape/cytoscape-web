// src/models/AppModel/RegisteredAppDialog.ts
//
// Internal model for a dialog opened by an app via apis.dialog.open().
// Stored in AppDialogStore. `render` is typed `unknown` to keep the model
// layer free of React imports, same convention as `component` on
// RegisteredAppResource.
//
// Unlike 'apps-menu' resources, a dialog body IS an app-supplied React
// component — but it renders in its own modal layer (chrome owned by the
// host's Dialog wrapper: title, close button, padding), never inline in a
// shared menu list. That isolation is what makes a real component safe here.

export interface RegisteredAppDialog {
  readonly id: string
  readonly appId: string
  readonly title: string
  /**
   * (props: { close: () => void }) => ReactNode — kept opaque here; the
   * host casts to the real signature when rendering in AppDialogHost.
   */
  readonly render: unknown
  readonly maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** If true, hides the close button and disables backdrop/Escape close. */
  readonly disableClose?: boolean
}
