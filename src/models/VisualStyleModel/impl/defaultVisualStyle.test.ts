import { VisualPropertyGroup } from '../VisualPropertyGroup'
import { NodeVisualPropertyName } from '../VisualPropertyName'
import { EdgeVisualPropertyName } from '../VisualPropertyName'
import {
  DEFAULT_CUSTOM_GRAPHICS,
  DEFAULT_CUSTOM_GRAPHICS_POSITION,
  DEFAULT_CUSTOM_GRAPHICS_SIZE,
  DEFAULT_NODE_LABEL_POSITION,
  getDefaultVisualStyle,
} from './defaultVisualStyle'

// to run these: npx jest src/models/VisualStyleModel/impl/defaultVisualStyle.test.ts

describe('DefaultVisualStyle', () => {
  describe('DEFAULT_NODE_LABEL_POSITION', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_NODE_LABEL_POSITION.HORIZONTAL_ALIGN).toBe('center')
      expect(DEFAULT_NODE_LABEL_POSITION.VERTICAL_ALIGN).toBe('center')
      expect(DEFAULT_NODE_LABEL_POSITION.HORIZONTAL_ANCHOR).toBe('center')
      expect(DEFAULT_NODE_LABEL_POSITION.VERTICAL_ANCHOR).toBe('center')
      expect(DEFAULT_NODE_LABEL_POSITION.JUSTIFICATION).toBe('center')
      expect(DEFAULT_NODE_LABEL_POSITION.MARGIN_X).toBe(0)
      expect(DEFAULT_NODE_LABEL_POSITION.MARGIN_Y).toBe(0)
    })
  })

  describe('DEFAULT_CUSTOM_GRAPHICS_POSITION', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CUSTOM_GRAPHICS_POSITION.JUSTIFICATION).toBe('center')
      expect(DEFAULT_CUSTOM_GRAPHICS_POSITION.MARGIN_X).toBe(0)
      expect(DEFAULT_CUSTOM_GRAPHICS_POSITION.MARGIN_Y).toBe(0)
      expect(DEFAULT_CUSTOM_GRAPHICS_POSITION.ENTITY_ANCHOR).toBe('C')
      expect(DEFAULT_CUSTOM_GRAPHICS_POSITION.GRAPHICS_ANCHOR).toBe('C')
    })
  })

  describe('DEFAULT_CUSTOM_GRAPHICS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CUSTOM_GRAPHICS.type).toBe('none')
      expect(DEFAULT_CUSTOM_GRAPHICS.name).toBe('none')
      expect(DEFAULT_CUSTOM_GRAPHICS.properties).toEqual({})
    })
  })

  describe('DEFAULT_CUSTOM_GRAPHICS_SIZE', () => {
    it('should be set to 50', () => {
      expect(DEFAULT_CUSTOM_GRAPHICS_SIZE).toBe(50)
    })

    it('should be a number', () => {
      expect(typeof DEFAULT_CUSTOM_GRAPHICS_SIZE).toBe('number')
    })
  })

  describe('getDefaultVisualStyle', () => {
    it('should return a visual style object', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle).toBeDefined()
      expect(typeof visualStyle).toBe('object')
    })

    it('should contain node visual properties', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.nodeShape).toBeDefined()
      expect(visualStyle.nodeBackgroundColor).toBeDefined()
      expect(visualStyle.nodeHeight).toBeDefined()
      expect(visualStyle.nodeWidth).toBeDefined()
      expect(visualStyle.nodeLabel).toBeDefined()
    })

    it('should contain edge visual properties', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.edgeLineColor).toBeDefined()
      expect(visualStyle.edgeWidth).toBeDefined()
      expect(visualStyle.edgeTargetArrowShape).toBeDefined()
      expect(visualStyle.edgeSourceArrowShape).toBeDefined()
    })

    it('should contain network visual properties', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.networkBackgroundColor).toBeDefined()
    })

    it('should have node properties with correct group', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.nodeShape.group).toBe(VisualPropertyGroup.Node)
      expect(visualStyle.nodeBackgroundColor.group).toBe(
        VisualPropertyGroup.Node,
      )
      expect(visualStyle.nodeHeight.group).toBe(VisualPropertyGroup.Node)
    })

    it('should have edge properties with correct group', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.edgeLineColor.group).toBe(VisualPropertyGroup.Edge)
      expect(visualStyle.edgeWidth.group).toBe(VisualPropertyGroup.Edge)
      expect(visualStyle.edgeTargetArrowShape.group).toBe(
        VisualPropertyGroup.Edge,
      )
    })

    it('should have network properties with correct group', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.networkBackgroundColor.group).toBe(
        VisualPropertyGroup.Network,
      )
    })

    it('should have default values for node properties', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.nodeShape.defaultValue).toBe('round-rectangle')
      expect(visualStyle.nodeBackgroundColor.defaultValue).toBe('#89D0F5')
      expect(visualStyle.nodeHeight.defaultValue).toBe(35)
      expect(visualStyle.nodeWidth.defaultValue).toBe(75)
    })

    it('should have default values for edge properties', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.edgeLineColor.defaultValue).toBe('#848484')
      expect(visualStyle.edgeWidth.defaultValue).toBe(2)
      expect(visualStyle.edgeTargetArrowShape.defaultValue).toBe('none')
      expect(visualStyle.edgeSourceArrowShape.defaultValue).toBe('none')
    })

    it('should have empty bypass maps by default', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.nodeShape.bypassMap.size).toBe(0)
      expect(visualStyle.edgeLineColor.bypassMap.size).toBe(0)
      expect(visualStyle.networkBackgroundColor.bypassMap.size).toBe(0)
    })

    it('should have nodeLabel with passthrough mapping by default', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.nodeLabel.mapping).toBeDefined()
      if (visualStyle.nodeLabel.mapping) {
        expect(visualStyle.nodeLabel.mapping.type).toBe('passthrough')
        expect(visualStyle.nodeLabel.mapping.attribute).toBe('name')
      }
    })

    it('should include all custom graphics properties', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.nodeImageChart1).toBeDefined()
      expect(visualStyle.nodeImageChart2).toBeDefined()
      expect(visualStyle.nodeImageChart9).toBeDefined()
      expect(visualStyle.nodeImageChartPosition1).toBeDefined()
      expect(visualStyle.nodeImageChartSize1).toBeDefined()
    })

    it('should have custom graphics with default values', () => {
      const visualStyle = getDefaultVisualStyle()

      expect(visualStyle.nodeImageChart1.defaultValue).toEqual(
        DEFAULT_CUSTOM_GRAPHICS,
      )
      expect(visualStyle.nodeImageChartPosition1.defaultValue).toEqual(
        DEFAULT_CUSTOM_GRAPHICS_POSITION,
      )
      expect(visualStyle.nodeImageChartSize1.defaultValue).toBe(
        DEFAULT_CUSTOM_GRAPHICS_SIZE,
      )
    })

    it('should return a new instance each time', () => {
      const style1 = getDefaultVisualStyle()
      const style2 = getDefaultVisualStyle()

      expect(style1).not.toBe(style2)
    })
  })
})
