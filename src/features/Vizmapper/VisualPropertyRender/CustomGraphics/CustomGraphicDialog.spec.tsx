import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { CustomGraphicsType } from '../../../../models/VisualStyleModel'
import {
  CustomGraphicsNameType,
  CustomGraphicsTypeType,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { CustomGraphicDialog } from './CustomGraphicDialog'

// The image option is deliberately withheld from the picker: Cytoscape Desktop
// cannot render image custom graphics carried in a CX2 at all (it loads bytes
// from its own session pool and never fetches properties.url), so authoring one
// here would quietly produce a file that shows "?" downstream. Images that
// already exist — imported from a CX2, or authored before this restriction —
// must still be selectable and editable.
// See docs/design/custom-graphics-image/custom-graphics-image-passthrough.md

const NETWORK_ID = 'net1'

const imageValue: CustomGraphicsType = {
  type: CustomGraphicsTypeType.Image,
  name: CustomGraphicsNameType.Image,
  properties: { url: 'https://example.com/img.png' },
}

const svgImageValue: CustomGraphicsType = {
  type: CustomGraphicsTypeType.Image,
  name: CustomGraphicsNameType.SVGImage,
  properties: { url: 'https://example.com/img.svg' },
}

const pieValue: CustomGraphicsType = {
  type: CustomGraphicsTypeType.Chart,
  name: CustomGraphicsNameType.PieChart,
  properties: {
    cy_range: [0, 1],
    cy_colorScheme: '',
    cy_startAngle: 0,
    cy_colors: [],
    cy_dataColumns: [],
  },
}

const renderDialog = (initialValue: CustomGraphicsType | null) =>
  render(
    <CustomGraphicDialog
      open={true}
      initialValue={initialValue}
      currentNetworkId={NETWORK_ID}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />,
  )

// The graphic-type cards are labelled exactly 'Pie Chart' / 'Donut Chart' /
// 'Image'. Match exact text so the 'Image URL' step heading can't be mistaken
// for the card.
const cardLabels = (label: string) =>
  screen.queryAllByText(label, { exact: true })

describe('CustomGraphicDialog graphic-type options', () => {
  beforeEach(() => {
    useTableStore.setState({ tables: {} })
    useWorkspaceStore.setState({
      workspace: { currentNetworkId: NETWORK_ID } as any,
    })
    vi.clearAllMocks()
  })

  it('offers pie and donut but not image when authoring a new value', () => {
    renderDialog(null)

    expect(cardLabels('Pie Chart').length).toBeGreaterThan(0)
    expect(cardLabels('Donut Chart').length).toBeGreaterThan(0)
    expect(cardLabels('Image')).toHaveLength(0)
  })

  it('does not offer image when editing an existing chart value', () => {
    renderDialog(pieValue)

    expect(cardLabels('Pie Chart').length).toBeGreaterThan(0)
    expect(cardLabels('Image')).toHaveLength(0)
  })

  it('keeps the image option when editing a value that is already an image', () => {
    renderDialog(imageValue)

    expect(cardLabels('Image').length).toBeGreaterThan(0)
  })

  it('keeps the image option for an SVG image authored in Desktop', () => {
    renderDialog(svgImageValue)

    expect(cardLabels('Image').length).toBeGreaterThan(0)
  })
})
