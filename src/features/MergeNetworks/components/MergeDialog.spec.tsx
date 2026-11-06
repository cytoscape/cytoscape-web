import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import MergeDialog from './MergeDialog'

const renderDialog = (): void => {
  render(
    <MemoryRouter>
      <MergeDialog
        open
        handleClose={() => undefined}
        uniqueName="Merged Network"
        workSpaceNetworks={[]}
        networksLoaded={{}}
      />
    </MemoryRouter>,
  )
}

describe('MergeDialog accessible names', () => {
  it('names the merge type buttons by their merge type', () => {
    renderDialog()
    for (const name of ['Union', 'Intersection', 'Difference']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: 'left aligned' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Merge type' })).toBeTruthy()
  })

  it('names the arrow buttons by what they do', () => {
    renderDialog()
    for (const name of [
      'Add to Networks to Merge',
      'Remove from Networks to Merge',
      'Move up',
      'Move down',
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })
})
