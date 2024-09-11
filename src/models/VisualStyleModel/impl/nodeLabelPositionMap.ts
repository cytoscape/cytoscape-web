import _ from 'lodash'
import { NodeLabelPositionType } from '../VisualPropertyValue'

export const NodeLabelOrientationType = {
  TopLeft: 'top-left',
  TopCenter: 'top-center',
  TopRight: 'top-right',
  CenterLeft: 'center-left',
  Center: 'center',
  CenterRight: 'center-right',
  BottomLeft: 'bottom-left',
  BottomCenter: 'bottom-center',
  BottomRight: 'bottom-right',
} as const
export type NodeLabelOrientationType =
  (typeof NodeLabelOrientationType)[keyof typeof NodeLabelOrientationType]

const orientationToCyJsValueMap: Record<
  NodeLabelOrientationType,
  { verticalAlign: string; horizontalAlign: string }
> = {
  [NodeLabelOrientationType.TopLeft]: {
    horizontalAlign: 'left',
    verticalAlign: 'top',
  },
  [NodeLabelOrientationType.TopCenter]: {
    horizontalAlign: 'center',
    verticalAlign: 'top',
  },
  [NodeLabelOrientationType.TopRight]: {
    horizontalAlign: 'right',
    verticalAlign: 'top',
  },
  [NodeLabelOrientationType.CenterLeft]: {
    horizontalAlign: 'left',
    verticalAlign: 'center',
  },
  [NodeLabelOrientationType.Center]: {
    horizontalAlign: 'center',
    verticalAlign: 'center',
  },
  [NodeLabelOrientationType.CenterRight]: {
    horizontalAlign: 'right',
    verticalAlign: 'center',
  },
  [NodeLabelOrientationType.BottomLeft]: {
    horizontalAlign: 'left',
    verticalAlign: 'bottom',
  },
  [NodeLabelOrientationType.BottomCenter]: {
    horizontalAlign: 'center',
    verticalAlign: 'bottom',
  },
  [NodeLabelOrientationType.BottomRight]: {
    horizontalAlign: 'right',
    verticalAlign: 'bottom',
  },
}

export const translateNodePositionToOrientation = (
  position: NodeLabelPositionType,
): NodeLabelOrientationType => {
  const computedPosition = computeNodeLabelPosition(position)
  let orientation: NodeLabelOrientationType = NodeLabelOrientationType.Center
  Object.entries(orientationToCyJsValueMap).forEach(
    ([orientationKey, cyjsValue]) => {
      if (
        computedPosition.horizontalAlign == cyjsValue.horizontalAlign &&
        computedPosition.verticalAlign == cyjsValue.verticalAlign
      ) {
        orientation = orientationKey as NodeLabelOrientationType
      }
    },
  )

  return orientation
}

export const orientationToPositionMap: Record<
  NodeLabelOrientationType,
  NodeLabelPositionType
> = {
  [NodeLabelOrientationType.TopLeft]: {
    HORIZONTAL_ALIGN: 'right',
    VERTICAL_ALIGN: 'bottom',
    HORIZONTAL_ANCHOR: 'left',
    VERTICAL_ANCHOR: 'top',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
  [NodeLabelOrientationType.TopCenter]: {
    HORIZONTAL_ALIGN: 'center',
    VERTICAL_ALIGN: 'bottom',
    HORIZONTAL_ANCHOR: 'center',
    VERTICAL_ANCHOR: 'top',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
  [NodeLabelOrientationType.TopRight]: {
    HORIZONTAL_ALIGN: 'left',
    VERTICAL_ALIGN: 'bottom',
    HORIZONTAL_ANCHOR: 'right',
    VERTICAL_ANCHOR: 'top',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
  [NodeLabelOrientationType.CenterLeft]: {
    HORIZONTAL_ALIGN: 'right',
    VERTICAL_ALIGN: 'center',
    HORIZONTAL_ANCHOR: 'left',
    VERTICAL_ANCHOR: 'center',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
  [NodeLabelOrientationType.Center]: {
    HORIZONTAL_ALIGN: 'center',
    VERTICAL_ALIGN: 'center',
    HORIZONTAL_ANCHOR: 'center',
    VERTICAL_ANCHOR: 'center',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
  [NodeLabelOrientationType.CenterRight]: {
    HORIZONTAL_ALIGN: 'left',
    VERTICAL_ALIGN: 'center',
    HORIZONTAL_ANCHOR: 'right',
    VERTICAL_ANCHOR: 'center',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
  [NodeLabelOrientationType.BottomLeft]: {
    HORIZONTAL_ALIGN: 'right',
    VERTICAL_ALIGN: 'top',
    HORIZONTAL_ANCHOR: 'left',
    VERTICAL_ANCHOR: 'bottom',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
  [NodeLabelOrientationType.BottomCenter]: {
    HORIZONTAL_ALIGN: 'center',
    VERTICAL_ALIGN: 'top',
    HORIZONTAL_ANCHOR: 'center',
    VERTICAL_ANCHOR: 'bottom',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
  [NodeLabelOrientationType.BottomRight]: {
    HORIZONTAL_ALIGN: 'left',
    VERTICAL_ALIGN: 'top',
    HORIZONTAL_ANCHOR: 'right',
    VERTICAL_ANCHOR: 'bottom',
    MARGIN_X: 0,
    MARGIN_Y: 0,
    JUSTIFICATION: 'center',
  },
}

export const nodeLabelPositionMap: any = {
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
        left: { 'text-halign': 'right', 'text-valign': 'top' },
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
        left: { 'text-halign': 'right', 'text-valign': 'bottom' },
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

export const computeNodeLabelPosition = (
  value: NodeLabelPositionType,
): {
  verticalAlign: string
  horizontalAlign: string
} => {
  const {
    HORIZONTAL_ALIGN,
    HORIZONTAL_ANCHOR,
    VERTICAL_ALIGN,
    VERTICAL_ANCHOR,
  } = value

  const result: {
    'text-halign': string
    'text-valign': string
  } =
    nodeLabelPositionMap[VERTICAL_ANCHOR][HORIZONTAL_ANCHOR][VERTICAL_ALIGN][
      HORIZONTAL_ALIGN
    ]

  const labelPosition = _.cloneDeep(result)

  return {
    verticalAlign: labelPosition['text-valign'],
    horizontalAlign: labelPosition['text-halign'],
  }
}
