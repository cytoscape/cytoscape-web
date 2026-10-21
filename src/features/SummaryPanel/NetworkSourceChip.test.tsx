import { fireEvent, render, screen } from '@testing-library/react'
import { Tooltip } from '@mui/material'
import { describe, expect, it } from 'vitest'

import { NetworkSourceChip } from './NetworkSourceChip'

describe('NetworkSourceChip tooltip', () => {
  it('shows the NDEx tooltip on hover', async () => {
    render(
      <Tooltip title="A network stored in the NDEx database (ndexbio.org)">
        <NetworkSourceChip isNdex />
      </Tooltip>,
    )

    fireEvent.mouseOver(screen.getByText('NDEx'))

    const tooltip = await screen.findByText(
      'A network stored in the NDEx database (ndexbio.org)',
    )

    expect(tooltip).toBeTruthy()
  })

  it('shows the Local tooltip on hover', async () => {
    render(
      <Tooltip title="A network stored on your local machine">
        <NetworkSourceChip isNdex={false} />
      </Tooltip>,
    )

    fireEvent.mouseOver(screen.getByText('Local'))

    const tooltip = await screen.findByText(
      'A network stored on your local machine',
    )

    expect(tooltip).toBeTruthy()
  })
})
