import { logUi } from '@/debug'

/**
 * Writes `text` to the system clipboard and reports whether it worked.
 *
 * Resolves `false`, and never rejects, when the clipboard is unavailable (an
 * insecure context such as a deployment served over plain http) or the browser
 * refuses the write (no permission, document not focused). Callers report
 * success only on `true`, so a copy never claims to have worked when it did
 * not, and no unhandled rejection escapes a click handler.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  // Typed as always present, but missing outside a secure context.
  const clipboard: Clipboard | undefined = navigator.clipboard
  if (clipboard === undefined) {
    logUi.warn(
      '[copyToClipboard]: Clipboard API unavailable (not a secure context)',
    )
    return false
  }

  try {
    await clipboard.writeText(text)
    return true
  } catch (error) {
    logUi.warn('[copyToClipboard]: Clipboard write refused', error)
    return false
  }
}
