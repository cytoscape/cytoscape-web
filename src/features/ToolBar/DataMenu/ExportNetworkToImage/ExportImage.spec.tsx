import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { forwardRef, useImperativeHandle } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { ExportImage } from './ExportImage'

vi.mock('../../../../data/hooks/stores/NetworkSummaryStore')
vi.mock('../../../../data/hooks/stores/WorkspaceStore')
// The forms render the live network view; only the dialog's own fields matter.
// PNG exposes a save() so the confirm path can run.
const mocks = vi.hoisted(() => ({ save: vi.fn(), trackEvent: vi.fn() }))
vi.mock('./PngExportForm', () => ({
  default: forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({ save: mocks.save }))
    return null
  }),
}))
vi.mock('@/data/analytics/trackEvent', () => ({
  trackEvent: mocks.trackEvent,
}))
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

describe('ExportImage analytics', () => {
  beforeEach(() => {
    mocks.save.mockReset()
    mocks.trackEvent.mockReset()
    ;(useWorkspaceStore as unknown as Mock).mockImplementation((selector) =>
      selector({ workspace: { currentNetworkId: 'a' } }),
    )
    ;(useNetworkSummaryStore as unknown as Mock).mockImplementation(
      (selector) => selector({ summaries }),
    )
  })

  const confirm = async (): Promise<void> => {
    // The forms are lazy: one tick lets PNG's mock resolve and set its ref.
    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.click(
      screen.getByTestId('export-network-to-image-confirm-button'),
    )
  }

  it('counts a saved image as image_export with its format', async () => {
    mocks.save.mockResolvedValue(undefined)
    const handleClose = vi.fn()
    render(<ExportImage open handleClose={handleClose} />)

    await confirm()

    await waitFor(() => expect(handleClose).toHaveBeenCalled())
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.trackEvent).toHaveBeenCalledWith('image_export', {
      format: 'png',
    })
  })

  it('counts nothing when the save fails', async () => {
    mocks.save.mockRejectedValue(new Error('canvas tainted'))
    const handleClose = vi.fn()
    render(<ExportImage open handleClose={handleClose} />)

    await confirm()

    await waitFor(() => expect(handleClose).toHaveBeenCalled())
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.trackEvent).not.toHaveBeenCalled()
  })
})
