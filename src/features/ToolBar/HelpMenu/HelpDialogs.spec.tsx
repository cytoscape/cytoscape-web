import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { AboutDialog } from './AboutDialog'
import { BugReportDialog } from './BugReportDialog'
import { CitationDialog } from './CitationDialog'
import { citationsAsBibtex, citationsAsText } from './citations'
import { LicenseDialog } from './LicenseDialog'

vi.mock('../../../data/db', () => ({
  getDatabaseVersion: () => 1,
}))

type HelpDialog = (props: {
  open: boolean
  onClose: () => void
}) => ReactElement

/**
 * The Help dialogs close through a title-bar "X" only (Bug Report also has
 * Cancel). Backdrop and Esc are inert (DIALOG_DISMISS_POLICY.md), so the X is
 * the exit and must be findable by its exact accessible name.
 */
describe.each<[string, HelpDialog, string]>([
  ['AboutDialog', AboutDialog, 'about-dialog-close-button'],
  ['CitationDialog', CitationDialog, 'citation-dialog-close-button'],
  ['LicenseDialog', LicenseDialog, 'license-dialog-close-button'],
  ['BugReportDialog', BugReportDialog, 'bug-report-dialog-close-button'],
])('%s close button', (_name, Dialog, testId) => {
  it('is labelled exactly "Close" and calls onClose', () => {
    const onClose = vi.fn()
    render(<Dialog open={true} onClose={onClose} />)

    const button = screen.getByTestId(testId)
    expect(button.getAttribute('aria-label')).toBe('Close')

    fireEvent.click(button)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('BugReportDialog', () => {
  it('closes from its Cancel button', () => {
    const onClose = vi.fn()
    render(<BugReportDialog open={true} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('bug-report-dialog-cancel-button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('puts the issue-collector trigger id on the report button', () => {
    render(<BugReportDialog open={true} onClose={vi.fn()} />)

    // The Atlassian collector looks this id up and attaches its click
    // handler to it; it stays disabled until the collector has loaded.
    const trigger = document.getElementById('myCustomTrigger')
    expect(trigger?.tagName).toBe('BUTTON')
    expect(trigger).toBe(screen.getByTestId('bug-report-dialog-report-button'))
  })

  it('says the environment details are filled in automatically', () => {
    render(<BugReportDialog open={true} onClose={vi.fn()} />)

    // getIssueEnvironment() pre-fills version, OS and browser, so the dialog
    // must not ask the user to type them.
    expect(screen.getByText(/added to the report automatically/i)).toBeTruthy()
    expect(screen.queryByText(/what browser you/i)).toBeNull()
  })
})

describe('CitationDialog', () => {
  it('copies both citations as plain text and as BibTeX', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<CitationDialog open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByTestId('citation-dialog-copy-text-button'))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText).toHaveBeenLastCalledWith(citationsAsText())

    fireEvent.click(screen.getByTestId('citation-dialog-copy-bibtex-button'))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    expect(writeText).toHaveBeenLastCalledWith(citationsAsBibtex())
  })
})

/**
 * Issue #994: a refused clipboard write must tell the user, not fail silently.
 */
describe.each<[string, HelpDialog, string]>([
  ['AboutDialog', AboutDialog, 'about-dialog-copy-button'],
  ['LicenseDialog', LicenseDialog, 'license-dialog-copy-button'],
])('%s copy button', (_name, Dialog, testId) => {
  beforeEach(() => {
    useMessageStore.getState().resetMessages()
  })

  it('shows an error when the clipboard refuses the write', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<Dialog open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByTestId(testId))

    await waitFor(() =>
      expect(useMessageStore.getState().messages.at(-1)?.severity).toBe(
        MessageSeverity.ERROR,
      ),
    )
  })

  it('shows no error when the copy succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<Dialog open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByTestId(testId))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(useMessageStore.getState().messages).toHaveLength(0)
  })
})
