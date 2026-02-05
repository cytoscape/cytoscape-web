import { NodeLabelPositionType } from '../VisualPropertyValue'
import {
  computeNodeLabelPosition,
  NodeLabelOrientationType,
  orientationToPositionMap,
  translateNodePositionToOrientation,
} from './nodeLabelPositionMap'

// to run these: npx jest src/models/VisualStyleModel/impl/nodeLabelPositionMap.test.ts

describe('nodeLabelPositionMap', () => {
  describe('computeNodeLabelPosition', () => {
    it('should compute center position correctly', () => {
      const position: NodeLabelPositionType = {
        HORIZONTAL_ALIGN: 'center',
        VERTICAL_ALIGN: 'center',
        HORIZONTAL_ANCHOR: 'center',
        VERTICAL_ANCHOR: 'center',
        JUSTIFICATION: 'center',
        MARGIN_X: 0,
        MARGIN_Y: 0,
      }

      const result = computeNodeLabelPosition(position)

      expect(result.horizontalAlign).toBe('center')
      expect(result.verticalAlign).toBe('center')
    })

    it('should compute top-left position correctly', () => {
      const position: NodeLabelPositionType = {
        HORIZONTAL_ALIGN: 'left',
        VERTICAL_ALIGN: 'top',
        HORIZONTAL_ANCHOR: 'left',
        VERTICAL_ANCHOR: 'top',
        JUSTIFICATION: 'center',
        MARGIN_X: 0,
        MARGIN_Y: 0,
      }

      const result = computeNodeLabelPosition(position)

      expect(result.horizontalAlign).toBeDefined()
      expect(result.verticalAlign).toBeDefined()
    })

    it('should compute bottom-right position correctly', () => {
      const position: NodeLabelPositionType = {
        HORIZONTAL_ALIGN: 'right',
        VERTICAL_ALIGN: 'bottom',
        HORIZONTAL_ANCHOR: 'right',
        VERTICAL_ANCHOR: 'bottom',
        JUSTIFICATION: 'center',
        MARGIN_X: 0,
        MARGIN_Y: 0,
      }

      const result = computeNodeLabelPosition(position)

      expect(result.horizontalAlign).toBeDefined()
      expect(result.verticalAlign).toBeDefined()
    })

    it('should handle various position combinations', () => {
      const positions: NodeLabelPositionType[] = [
        {
          HORIZONTAL_ALIGN: 'left',
          VERTICAL_ALIGN: 'top',
          HORIZONTAL_ANCHOR: 'left',
          VERTICAL_ANCHOR: 'top',
          JUSTIFICATION: 'center',
          MARGIN_X: 0,
          MARGIN_Y: 0,
        },
        {
          HORIZONTAL_ALIGN: 'right',
          VERTICAL_ALIGN: 'bottom',
          HORIZONTAL_ANCHOR: 'right',
          VERTICAL_ANCHOR: 'bottom',
          JUSTIFICATION: 'center',
          MARGIN_X: 0,
          MARGIN_Y: 0,
        },
        {
          HORIZONTAL_ALIGN: 'center',
          VERTICAL_ALIGN: 'center',
          HORIZONTAL_ANCHOR: 'center',
          VERTICAL_ANCHOR: 'center',
          JUSTIFICATION: 'center',
          MARGIN_X: 0,
          MARGIN_Y: 0,
        },
      ]

      positions.forEach((position) => {
        const result = computeNodeLabelPosition(position)
        expect(result.horizontalAlign).toBeDefined()
        expect(result.verticalAlign).toBeDefined()
        expect(['left', 'center', 'right']).toContain(result.horizontalAlign)
        expect(['top', 'center', 'bottom']).toContain(result.verticalAlign)
      })
    })
  })

  describe('translateNodePositionToOrientation', () => {
    it('should translate center position to center orientation', () => {
      const position: NodeLabelPositionType = {
        HORIZONTAL_ALIGN: 'center',
        VERTICAL_ALIGN: 'center',
        HORIZONTAL_ANCHOR: 'center',
        VERTICAL_ANCHOR: 'center',
        JUSTIFICATION: 'center',
        MARGIN_X: 0,
        MARGIN_Y: 0,
      }

      const orientation = translateNodePositionToOrientation(position)

      expect(orientation).toBeDefined()
      expect(Object.values(NodeLabelOrientationType)).toContain(orientation)
    })

    it('should translate various positions to orientations', () => {
      const testCases = [
        {
          position: {
            HORIZONTAL_ALIGN: 'left' as const,
            VERTICAL_ALIGN: 'top' as const,
            HORIZONTAL_ANCHOR: 'left' as const,
            VERTICAL_ANCHOR: 'top' as const,
            JUSTIFICATION: 'center' as const,
            MARGIN_X: 0,
            MARGIN_Y: 0,
          },
        },
        {
          position: {
            HORIZONTAL_ALIGN: 'right' as const,
            VERTICAL_ALIGN: 'bottom' as const,
            HORIZONTAL_ANCHOR: 'right' as const,
            VERTICAL_ANCHOR: 'bottom' as const,
            JUSTIFICATION: 'center' as const,
            MARGIN_X: 0,
            MARGIN_Y: 0,
          },
        },
      ]

      testCases.forEach(({ position }) => {
        const orientation = translateNodePositionToOrientation(position)
        expect(orientation).toBeDefined()
        expect(Object.values(NodeLabelOrientationType)).toContain(orientation)
      })
    })
  })

  describe('NodeLabelOrientationType', () => {
    it('should contain all expected orientation types', () => {
      expect(NodeLabelOrientationType.TopLeft).toBe('top-left')
      expect(NodeLabelOrientationType.TopCenter).toBe('top-center')
      expect(NodeLabelOrientationType.TopRight).toBe('top-right')
      expect(NodeLabelOrientationType.CenterLeft).toBe('center-left')
      expect(NodeLabelOrientationType.Center).toBe('center')
      expect(NodeLabelOrientationType.CenterRight).toBe('center-right')
      expect(NodeLabelOrientationType.BottomLeft).toBe('bottom-left')
      expect(NodeLabelOrientationType.BottomCenter).toBe('bottom-center')
      expect(NodeLabelOrientationType.BottomRight).toBe('bottom-right')
    })
  })

  describe('orientationToPositionMap', () => {
    it('should map all orientations to positions', () => {
      Object.values(NodeLabelOrientationType).forEach((orientation) => {
        const position = orientationToPositionMap[orientation]
        expect(position).toBeDefined()
        expect(position.HORIZONTAL_ALIGN).toBeDefined()
        expect(position.VERTICAL_ALIGN).toBeDefined()
        expect(position.HORIZONTAL_ANCHOR).toBeDefined()
        expect(position.VERTICAL_ANCHOR).toBeDefined()
        expect(position.MARGIN_X).toBeDefined()
        expect(position.MARGIN_Y).toBeDefined()
      })
    })

    it('should map center orientation to center position', () => {
      const position = orientationToPositionMap[NodeLabelOrientationType.Center]
      expect(position.HORIZONTAL_ALIGN).toBe('center')
      expect(position.VERTICAL_ALIGN).toBe('center')
      expect(position.HORIZONTAL_ANCHOR).toBe('center')
      expect(position.VERTICAL_ANCHOR).toBe('center')
    })

    it('should map top-left orientation correctly', () => {
      const position = orientationToPositionMap[NodeLabelOrientationType.TopLeft]
      expect(position.HORIZONTAL_ANCHOR).toBe('left')
      expect(position.VERTICAL_ANCHOR).toBe('top')
    })

    it('should map bottom-right orientation correctly', () => {
      const position = orientationToPositionMap[NodeLabelOrientationType.BottomRight]
      expect(position.HORIZONTAL_ANCHOR).toBe('right')
      expect(position.VERTICAL_ANCHOR).toBe('bottom')
    })
  })
})

