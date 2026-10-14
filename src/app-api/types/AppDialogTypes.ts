// src/app-api/types/AppDialogTypes.ts
//
// Types for the Dialog API — the escape hatch for 'apps-menu' actions (or
// any other app code holding an AppContextApis) that need more than a
// label + icon + onClick: a parameter form, live progress, a multi-step
// wizard, anything with real component state.
//
// This is deliberately NOT part of the menu itself. `RegisterMenuItemOptions`
// never accepts a component, so an app cannot inject arbitrary React into
// the shared Apps dropdown. A dialog is a separate modal layer whose chrome
// (title bar, Close "X", padding) the host owns — the same isolation the
// 'right-panel' and 'modal-launcher' slots already rely on — so a real
// component is safe here even though it is not inside the menu.
//
// Relationship to the 'modal-launcher' slot: both render app content inside
// the host's dialog shell. 'modal-launcher' is declarative (register a
// component by id, open it later) and the app renders its own DialogTitle;
// the Dialog API is imperative (open an ad-hoc render function right now)
// and the host renders the title bar. Pick whichever fits the call site.

import type { ReactNode } from 'react'

import type { ApiResult } from './ApiResult'

export interface DialogRenderProps {
  /**
   * Closes this dialog — the same close path as the host's Close "X" and the
   * Escape key. Wire Cancel/Done buttons to this. Safe to call more than once.
   */
  close: () => void
}

export interface OpenDialogOptions {
  /**
   * Optional stable id. Reusing an id replaces the dialog previously opened
   * with that id instead of stacking a second one. Defaults to a generated
   * id when omitted; `open()` returns the id either way.
   */
  id?: string
  /** Shown in the host-owned title bar. Required, non-empty. */
  title: string
  /**
   * Renders the dialog body. Receives `close` to dismiss the dialog. The
   * host wraps the result in its own error boundary and a `Suspense`
   * boundary, so the body may render `React.lazy` components.
   */
  render: (props: DialogRenderProps) => ReactNode
  /**
   * Maximum dialog width (MUI Dialog `maxWidth`).
   * @default 'sm'
   */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  /**
   * Stretch the dialog to `maxWidth` (MUI Dialog `fullWidth`).
   * @default false
   */
  fullWidth?: boolean
}

/**
 * Per-app Dialog API. Bound to a specific appId at creation time (via
 * `createDialogApi(appId)`), so an app can only open and close its own
 * dialogs, and every dialog it opened is closed when the app is disabled.
 *
 * Available via `AppContext.apis.dialog` in `mount()`, as the `apis`
 * argument of an 'apps-menu' `onClick`, or via `useAppContext().apis.dialog`
 * in a host-rendered app component. NOT available on `window.CyWebApi`.
 *
 * Dismissal follows the host's dialog policy
 * (docs/specifications/DIALOG_DISMISS_POLICY.md): backdrop click is inert.
 * The host always renders a Close "X" in the title bar, and Escape closes the
 * dialog (the documented exception for app dialogs), so every dialog has an
 * exit even if the body renders none.
 */
export interface DialogApi {
  /**
   * Opens a dialog. If `options.id` matches a dialog this app already has
   * open, that dialog is replaced in place.
   */
  open(options: OpenDialogOptions): ApiResult<{ dialogId: string }>

  /**
   * Closes a dialog. With no argument, closes the most recently opened
   * dialog from this app — the common case, since most apps have at most
   * one dialog open at a time. Idempotent when the given id is not open;
   * fails with RESOURCE_NOT_FOUND when called without an id and this app
   * has no dialog open.
   */
  close(dialogId?: string): ApiResult
}
