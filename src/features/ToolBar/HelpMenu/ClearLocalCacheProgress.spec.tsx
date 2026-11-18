import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ClearLocalCacheProgress } from './ClearLocalCacheProgress'

describe('ClearLocalCacheProgress', () => {
  it('renders nothing while no clear is running', () => {
    render(<ClearLocalCacheProgress open={false} waitingFor={null} />)

    expect(screen.queryByTestId('clear-local-cache-progress')).toBeNull()
  })

  it('shows progress without a waiting notice while nothing is blocked', () => {
    render(<ClearLocalCacheProgress open waitingFor={null} />)

    expect(screen.getByText('Clearing local cache...')).toBeTruthy()
    expect(screen.queryByTestId('clear-local-cache-waiting')).toBeNull()
  })

  it('names the database another tab holds and what to do about it', () => {
    render(<ClearLocalCacheProgress open waitingFor={['cyweb-manual-db']} />)

    const waiting = screen.getByTestId('clear-local-cache-waiting')
    expect(waiting.textContent).toContain('cyweb-manual-db')
    expect(waiting.textContent).toContain('Close your other Cytoscape Web tabs')
  })
})
