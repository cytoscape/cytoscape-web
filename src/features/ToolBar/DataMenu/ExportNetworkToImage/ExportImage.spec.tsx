import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { citationsAsBibtex, citationsAsText } from '../../HelpMenu/citations'
import { ExportImage } from './ExportImage'

vi.mock('../../../../data/hooks/stores/NetworkSummaryStore')
vi.mock('../../../../data/hooks/stores/WorkspaceStore')
// The forms render the live network view; only the dialog's own fields matter.
vi.mock('./PngExportForm', () => ({ default: () => null }))
vi.mock('./PdfExportForm', () => ({ default: () => null }))
vi.mock('./SvgExportForm', () => ({ default: () => null }))

type Mock = import('vitest').Mock

const summaries: Record<string, { name: string }> = {
  a: { name: 'Network A' },
  b: { name: 'Network B' },
}
let currentNetworkId = 'a'

const fileNameInput = (): HTMLInputElement =>
  screen
    .getByTestId('export-network-to-image-file-name-input')
    .querySelector('input') as HTMLInputElement

describe('ExportImage', () => {
  beforeEach(() => {
    currentNetworkId = 'a'
    ;(useWorkspaceStore as unknown as Mock).mockImplementation((selector) =>
      selector({ workspace: { currentNetworkId } }),
    )
    ;(useNetworkSummaryStore as unknown as Mock).mockImplementation(
      (selector) => selector({ summaries }),
    )
  })

  // The Data menu and the summary panel keep the dialog mounted and only
  // toggle `open`, so the fields must re-seed on every open: the file name
  // follows the network that is current when the dialog opens.
  it('seeds the file name from the current network on every open', () => {
    const { rerender } = render(<ExportImage open handleClose={() => {}} />)
    expect(fileNameInput().value).toBe('Network A')

    rerender(<ExportImage open={false} handleClose={() => {}} />)
    currentNetworkId = 'b'
    rerender(<ExportImage open handleClose={() => {}} />)

    expect(fileNameInput().value).toBe('Network B')
  })
})

describe('ExportImage citation line', () => {
  beforeEach(() => {
    ;(useWorkspaceStore as unknown as Mock).mockImplementation((selector) =>
      selector({ workspace: { currentNetworkId: 'a' } }),
    )
    ;(useNetworkSummaryStore as unknown as Mock).mockImplementation(
      (selector) => selector({ summaries }),
    )
  })

  // Export is the step before a figure goes into a paper (#883).
  it('asks for a citation and copies it as text or BibTeX', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<ExportImage open handleClose={() => {}} />)

    expect(
      screen.getByTestId('export-network-to-image-citation').textContent,
    ).toContain('Using this in a publication? Cite Cytoscape Web.')

    fireEvent.click(
      screen.getByTestId('export-network-to-image-copy-citation-button'),
    )
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText).toHaveBeenLastCalledWith(citationsAsText())

    fireEvent.click(
      screen.getByTestId('export-network-to-image-copy-bibtex-button'),
    )
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    expect(writeText).toHaveBeenLastCalledWith(citationsAsBibtex())
  })
})
