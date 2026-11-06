import { useCallback } from 'react'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { logUi } from '../../../debug'
import { MessageSeverity } from '../../../models/MessageModel'
import { citationsAsBibtex, citationsAsText } from './citations'

/**
 * Copy the citations to the clipboard and report the outcome in the snackbar.
 * Used by Help → Citation and the image export dialog.
 */
export const useCopyCitations = (): {
  copyText: () => Promise<void>
  copyBibtex: () => Promise<void>
} => {
  const addMessage = useMessageStore((state) => state.addMessage)

  const copy = useCallback(
    async (text: string, what: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(text)
        addMessage({
          message: `Copied ${what} to clipboard`,
          duration: 3000,
          severity: MessageSeverity.INFO,
        })
      } catch (err) {
        logUi.error(`[useCopyCitations]: Failed to copy ${what}: `, err)
        addMessage({
          message: `Failed to copy ${what}`,
          duration: 3000,
          severity: MessageSeverity.ERROR,
        })
      }
    },
    [addMessage],
  )

  const copyText = useCallback(
    () => copy(citationsAsText(), 'citation'),
    [copy],
  )
  const copyBibtex = useCallback(
    () => copy(citationsAsBibtex(), 'BibTeX'),
    [copy],
  )

  return { copyText, copyBibtex }
}
