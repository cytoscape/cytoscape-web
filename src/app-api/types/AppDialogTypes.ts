// src/app-api/types/AppDialogTypes.ts
//
// Types for the Dialog API — the escape hatch for 'apps-menu' actions (or
// any other app code holding an AppContextApis) that need more than a
// label+icon+onClick: a form with custom hooks, live state, a progress
// modal, etc.
//
// This is intentionally NOT part of the menu itself. `RegisterMenuItemOptions`
// never accepts a component, so an app cannot inject arbitrary React into
// the shared Apps dropdown. A dialog is a separate modal layer whose chrome
// (title bar, padding, close button) the host owns — the same isolation
// 'right-panel' already relies on — so a real component is safe here even
// though it isn't inside the menu's <MenuList>.

import type { ReactNode } from 'react'

import type { ApiResult } from './ApiResult'

export interface DialogRenderProps {
  /** Closes this dialog. Safe to call multiple times. */
  close: () => void
}

export interface OpenDialogOptions {
  /**
   * Optional stable id. Reusing an id upserts (replaces) the previously
   * opened dialog with that id instead of stacking a second one. Defaults
   * to a generated id when omitted.
   */
  id?: string
  /** Shown in the host-owned dialog title bar. */
  title: string
  /** Renders the dialog body. Receives `close` to dismiss the dialog. */
  render: (props: DialogRenderProps) => ReactNode
  /** @default 'sm' */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /**
   * If true, hides the host's close button and disables backdrop/Escape
   * dismissal — for a step that must not be dismissed until it finishes
   * (e.g. a non-cancellable save). Use sparingly.
   * @default false
   */
  disableClose?: boolean
}

/**
 * Per-app Dialog API. Bound to a specific appId at creation time (via
 * `createDialogApi(appId)`), so an app can only open/close its own dialogs.
 *
 * Available via `AppContext.apis.dialog` in `mount()`, in an 'apps-menu'
 * `onClick`, or via `useAppContext().apis.dialog` in a 'right-panel'
 * component. NOT available on `window.CyWebApi`.
 */
export interface DialogApi {
  /** Opens (or, if `options.id` matches an open dialog, replaces) a dialog. */
  open(options: OpenDialogOptions): ApiResult<{ dialogId: string }>

  /**
   * Closes a dialog. With no argument, closes the most recently opened
   * dialog from this app — the common case, since most apps have at most
   * one dialog open at a time.
   */
  close(dialogId?: string): ApiResult
}
