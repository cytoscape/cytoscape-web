import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ClearLocalCacheProgress } from './ClearLocalCacheProgress'

const noop = (): void => {}

let appRoot: HTMLElement

beforeEach(() => {
  appRoot = document.createElement('div')
  appRoot.id = 'root'
  document.body.appendChild(appRoot)
})

afterEach(() => {
  appRoot.remove()
})

const renderInApp = (ui: React.ReactElement) =>
  render(ui, { container: appRoot })

describe('ClearLocalCacheProgress', () => {
  it('renders nothing while no clear is running', () => {
    renderInApp(
      <ClearLocalCacheProgress
        open={false}
        waitingFor={null}
        failure={null}
        onRetry={noop}
        onReload={noop}
      />,
    )

    expect(screen.queryByTestId('clear-local-cache-progress')).toBeNull()
    expect(appRoot.hasAttribute('inert')).toBe(false)
  })

  it('makes the editor inert and keeps itself outside it, readable by screen readers', () => {
    const { unmount } = renderInApp(
      <ClearLocalCacheProgress
        open
        waitingFor={null}
        failure={null}
        onRetry={noop}
        onReload={noop}
      />,
    )

    const overlay = screen.getByTestId('clear-local-cache-progress')
    expect(appRoot.hasAttribute('inert')).toBe(true)
    expect(appRoot.contains(overlay)).toBe(false)
    expect(overlay.closest('[aria-hidden="true"]')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain(
      'Clearing local cache...',
    )
    expect(screen.queryByTestId('clear-local-cache-waiting')).toBeNull()

    unmount()
    expect(appRoot.hasAttribute('inert')).toBe(false)
  })

  it('names the database another tab holds and what to do about it', () => {
    renderInApp(
      <ClearLocalCacheProgress
        open
        waitingFor={['cyweb-manual-db']}
        failure={null}
        onRetry={noop}
        onReload={noop}
      />,
    )

    const waiting = screen.getByTestId('clear-local-cache-waiting')
    expect(waiting.textContent).toContain('cyweb-manual-db')
    expect(waiting.textContent).toContain('Close your other Cytoscape Web tabs')
  })

  it('shows a failure with Try Again and Reload instead of reloading', () => {
    const onRetry = vi.fn()
    const onReload = vi.fn()
    renderInApp(
      <ClearLocalCacheProgress
        open
        waitingFor={null}
        failure="Could not delete cyweb-db. Please try again."
        onRetry={onRetry}
        onReload={onReload}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain(
      'Could not delete cyweb-db. Please try again.',
    )
    const retry = screen.getByTestId('clear-local-cache-retry')
    expect(document.activeElement).toBe(retry)
    expect(appRoot.hasAttribute('inert')).toBe(true)

    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('clear-local-cache-reload'))
    expect(onReload).toHaveBeenCalledTimes(1)
  })
})
