import { render, screen, waitFor } from '@testing-library/react'
import { lazy, Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '../data/hooks/stores/MessageStore'
import { LazyDialogBoundary } from './LazyDialogBoundary'

vi.mock('../data/hooks/stores/MessageStore')

const addMessage = vi.fn()

// What a stale tab after a redeploy, or a dropped connection, looks like to
// React.lazy: the chunk import rejects.
const FailingDialog = lazy(() =>
  Promise.reject(new Error('Failed to fetch dynamically imported module')),
)

describe('LazyDialogBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMessageStore as unknown as { getState: () => unknown }).getState =
      () => ({ addMessage })
    // React logs the caught error to the console; it is expected here.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('keeps the page and reports a dialog whose code failed to load', async () => {
    render(
      <div>
        <p>workspace</p>
        <LazyDialogBoundary name="Export Network to Image">
          <Suspense fallback={null}>
            <FailingDialog />
          </Suspense>
        </LazyDialogBoundary>
      </div>,
    )

    await waitFor(() =>
      expect(addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          message: expect.stringContaining('Export Network to Image'),
        }),
      ),
    )
    expect(screen.getByText('workspace')).toBeTruthy()
  })

  it('tries again on the next open, not on close', async () => {
    const boundary = (open: boolean) => (
      <LazyDialogBoundary name="Export Network to Image" open={open}>
        <Suspense fallback={null}>
          <FailingDialog />
        </Suspense>
      </LazyDialogBoundary>
    )
    const { rerender } = render(boundary(true))
    await waitFor(() => expect(addMessage).toHaveBeenCalledTimes(1))

    rerender(boundary(false))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(addMessage).toHaveBeenCalledTimes(1)

    rerender(boundary(true))
    await waitFor(() => expect(addMessage).toHaveBeenCalledTimes(2))
  })
})
