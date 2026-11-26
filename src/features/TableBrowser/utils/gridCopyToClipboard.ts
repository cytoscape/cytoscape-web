import { logUi } from '@/debug'

/**
 * Runs the data grid's own copy (`DataEditorRef.emit('copy')`) and reports
 * whether the clipboard write worked.
 *
 * Glide Data Grid builds the copy buffer itself (tab-separated text plus an
 * HTML table) but fires `navigator.clipboard.write()` / `writeText()` without
 * awaiting it, so `emit('copy')` resolves the same whether the copy worked or
 * not, and a refused write becomes an unhandled rejection. This wraps both
 * methods for the duration of the copy, collects the promises the grid starts,
 * and awaits them here.
 *
 * Resolves `false`, and never rejects, when the clipboard is unavailable (not a
 * secure context) or a write was refused. Resolves `true` when every write
 * succeeded, or when the grid wrote nothing (nothing selected to copy).
 */
export const gridCopyToClipboard = async (
  copy: () => Promise<void>,
): Promise<boolean> => {
  // Typed as always present, but missing outside a secure context, where the
  // grid's copy silently does nothing.
  const clipboard: Clipboard | undefined = navigator.clipboard
  if (clipboard === undefined) {
    logUi.warn(
      '[gridCopyToClipboard]: Clipboard API unavailable (not a secure context)',
    )
    return false
  }

  const writes: Promise<void>[] = []
  const originalWrite = clipboard.write
  const originalWriteText = clipboard.writeText
  // Shadow the prototype methods with own properties, then delete them, so
  // the clipboard object is left exactly as it was.
  const hadOwnWrite = Object.prototype.hasOwnProperty.call(clipboard, 'write')
  const hadOwnWriteText = Object.prototype.hasOwnProperty.call(
    clipboard,
    'writeText',
  )

  if (typeof originalWrite === 'function') {
    clipboard.write = (data: ClipboardItems): Promise<void> => {
      const pending = originalWrite.call(clipboard, data)
      writes.push(pending)
      return pending
    }
  }
  if (typeof originalWriteText === 'function') {
    clipboard.writeText = (text: string): Promise<void> => {
      const pending = originalWriteText.call(clipboard, text)
      writes.push(pending)
      return pending
    }
  }

  try {
    await copy()
  } catch (error) {
    logUi.warn('[gridCopyToClipboard]: Grid copy failed', error)
    // Settle any write already started so it cannot reject unhandled.
    void Promise.allSettled(writes)
    return false
  } finally {
    if (hadOwnWrite) clipboard.write = originalWrite
    else delete (clipboard as Partial<Clipboard>).write
    if (hadOwnWriteText) clipboard.writeText = originalWriteText
    else delete (clipboard as Partial<Clipboard>).writeText
  }

  try {
    await Promise.all(writes)
    return true
  } catch (error) {
    logUi.warn('[gridCopyToClipboard]: Clipboard write refused', error)
    return false
  }
}
