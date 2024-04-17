import _ from 'lodash'
import { HorizontalAlignType, VerticalAlignType } from '../VisualPropertyValue'
import { CXLabelPositionType } from './cxVisualPropertyConverter'

const cxNodeLabelPositionMap: any = {
  center: {
    center: {
      center: {
        center: { 'text-halign': 'center', 'text-valign': 'center' }, //  1
        left: { 'text-halign': 'right', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'center' },
      },
      top: {
        center: { 'text-halign': 'center', 'text-valign': 'center' },
        left: { 'text-halign': 'right', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'center' },
      },
      bottom: {
        center: { 'text-halign': 'center', 'text-valign': 'center' },
        left: { 'text-halign': 'right', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'center' },
      },
    },
    left: {
      center: {
        center: { 'text-halign': 'left', 'text-valign': 'center' },
        left: { 'text-halign': 'center', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'center' },
      },
      top: {
        center: { 'text-halign': 'left', 'text-valign': 'center' },
        left: { 'text-halign': 'center', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'center' },
      },
      bottom: {
        center: { 'text-halign': 'left', 'text-valign': 'center' },
        left: { 'text-halign': 'center', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'center' },
      },
    },
    right: {
      center: {
        center: { 'text-halign': 'right', 'text-valign': 'center' },
        left: { 'text-halign': 'right', 'text-valign': 'center' },
        right: { 'text-halign': 'center', 'text-valign': 'center' },
      },
      top: {
        center: { 'text-halign': 'right', 'text-valign': 'center' },
        left: { 'text-halign': 'right', 'text-valign': 'center' },
        right: { 'text-halign': 'center', 'text-valign': 'center' },
      },
      bottom: {
        center: { 'text-halign': 'right', 'text-valign': 'center' },
        left: { 'text-halign': 'center', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'top' },
      },
    },
  },
  top: {
    center: {
      center: {
        center: { 'text-halign': 'center', 'text-valign': 'top' },
        left: { 'text-halign': 'right', 'text-valign': 'top' },
        right: { 'text-halign': 'left', 'text-valign': 'top' },
      },
      top: {
        center: { 'text-halign': 'center', 'text-valign': 'center' },
        left: { 'text-halign': 'left', 'text-valign': 'top' },
        right: { 'text-halign': 'right', 'text-valign': 'top' },
      },
      bottom: {
        center: { 'text-halign': 'center', 'text-valign': 'top' },
        left: { 'text-halign': 'left', 'text-valign': 'top' },
        right: { 'text-halign': 'right', 'text-valign': 'top' },
      },
    },
    left: {
      center: {
        center: { 'text-halign': 'left', 'text-valign': 'top' },
        left: { 'text-halign': 'center', 'text-valign': 'top' },
        right: { 'text-halign': 'left', 'text-valign': 'top' },
      },
      top: {
        center: { 'text-halign': 'left', 'text-valign': 'center' },
        left: { 'text-halign': 'center', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'center' },
      },
      bottom: {
        center: { 'text-halign': 'left', 'text-valign': 'top' },
        left: { 'text-halign': 'center', 'text-valign': 'top' },
        right: { 'text-halign': 'left', 'text-valign': 'top' },
      },
    },
    right: {
      center: {
        center: { 'text-halign': 'right', 'text-valign': 'bottom' },
        left: { 'text-halign': 'right', 'text-valign': 'bottom' },
        right: { 'text-halign': 'center', 'text-valign': 'bottom' },
      },
      top: {
        center: { 'text-halign': 'right', 'text-valign': 'bottom' },
        left: { 'text-halign': 'right', 'text-valign': 'bottom' },
        right: { 'text-halign': 'center', 'text-valign': 'bottom' },
      },
      bottom: {
        center: { 'text-halign': 'right', 'text-valign': 'center' },
        left: { 'text-halign': 'right', 'text-valign': 'center' },
        right: { 'text-halign': 'center', 'text-valign': 'center' },
      },
    },
  },
  bottom: {
    center: {
      center: {
        center: { 'text-halign': 'center', 'text-valign': 'bottom' },
        left: { 'text-halign': 'right', 'text-valign': 'bottom' },
        right: { 'text-halign': 'left', 'text-valign': 'bottom' },
      },
      top: {
        center: { 'text-halign': 'center', 'text-valign': 'bottom' },
        left: { 'text-halign': 'right', 'text-valign': 'bottom' },
        right: { 'text-halign': 'left', 'text-valign': 'bottom' },
      },
      bottom: {
        center: { 'text-halign': 'center', 'text-valign': 'center' },
        left: { 'text-halign': 'left', 'text-valign': 'bottom' },
        right: { 'text-halign': 'right', 'text-valign': 'bottom' },
      },
    },
    left: {
      center: {
        center: { 'text-halign': 'left', 'text-valign': 'bottom' },
        left: { 'text-halign': 'left', 'text-valign': 'bottom' },
        right: { 'text-halign': 'center', 'text-valign': 'bottom' },
      },
      top: {
        center: { 'text-halign': 'left', 'text-valign': 'bottom' },
        left: { 'text-halign': 'center', 'text-valign': 'bottom' },
        right: { 'text-halign': 'left', 'text-valign': 'bottom' },
      },
      bottom: {
        center: { 'text-halign': 'left', 'text-valign': 'center' },
        left: { 'text-halign': 'center', 'text-valign': 'center' },
        right: { 'text-halign': 'left', 'text-valign': 'center' },
      },
    },
    right: {
      center: {
        center: { 'text-halign': 'right', 'text-valign': 'bottom' },
        left: { 'text-halign': 'center', 'text-valign': 'bottom' },
        right: { 'text-halign': 'right', 'text-valign': 'bottom' },
      },
      top: {
        center: { 'text-halign': 'right', 'text-valign': 'bottom' },
        left: { 'text-halign': 'right', 'text-valign': 'center' },
        right: { 'text-halign': 'center', 'text-valign': 'center' },
      },
      bottom: {
        center: { 'text-halign': 'right', 'text-valign': 'center' },
        left: { 'text-halign': 'right', 'text-valign': 'center' },
        right: { 'text-halign': 'center', 'text-valign': 'center' },
      },
    },
  },
}

export const cxNodeLabelPositionConverter = (
  value: CXLabelPositionType,
): {
  verticalAlign: VerticalAlignType
  horizontalAlign: HorizontalAlignType
} => {
  const {
    HORIZONTAL_ALIGN,
    HORIZONTAL_ANCHOR,
    VERTICAL_ALIGN,
    VERTICAL_ANCHOR,
  } = value

  const result: {
    'text-halign': HorizontalAlignType
    'text-valign': VerticalAlignType
  } =
    cxNodeLabelPositionMap[VERTICAL_ANCHOR][HORIZONTAL_ANCHOR][VERTICAL_ALIGN][
      HORIZONTAL_ALIGN
    ]

  const labelPosition = _.cloneDeep(result)

  return {
    verticalAlign: labelPosition['text-valign'],
    horizontalAlign: labelPosition['text-halign'],
  }
}
