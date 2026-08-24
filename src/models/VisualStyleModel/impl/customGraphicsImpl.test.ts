// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { VisualProperty } from '../VisualProperty'
import { NodeVisualPropertyName } from '../VisualPropertyName'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import {
  CustomGraphicsNameType,
  CustomGraphicsType,
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../VisualPropertyValue/CustomGraphicsType'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import {
  computeCustomGraphicsProperties,
  computeImageProperties,
  computePieChartProperties,
  computeRingChartProperties,
  getCustomGraphicNodeVps,
  getCustomGraphicsPropertyKeys,
  getFirstValidCustomGraphicVp,
  getNonCustomGraphicVps,
  getPieBackgroundColorViewModelProp,
  getPieBackgroundSizeViewModelProp,
  getSizePropertyForCustomGraphic,
  VALID_PIE_CHART_SLICE_INDEX_RANGE,
} from './customGraphicsImpl'
import { SpecialPropertyName } from './CyjsProperties/CyjsStyleModels/directMappingSelector'
import { createVisualStyle } from './visualStyleFnImpl'

// to run these: npx jest src/models/VisualStyleModel/impl/customGraphicsImpl.test.ts

describe('CustomGraphicsImpl', () => {
  describe('VALID_PIE_CHART_SLICE_INDEX_RANGE', () => {
    it('should be [1, 16]', () => {
      expect(VALID_PIE_CHART_SLICE_INDEX_RANGE).toEqual([1, 16])
    })
  })

  describe('getPieBackgroundColorViewModelProp', () => {
    it('should return correct property names for valid indices', () => {
      expect(getPieBackgroundColorViewModelProp(1)).toBe(
        SpecialPropertyName.Pie1BackgroundColor,
      )
      expect(getPieBackgroundColorViewModelProp(8)).toBe(
        SpecialPropertyName.Pie8BackgroundColor,
      )
      expect(getPieBackgroundColorViewModelProp(16)).toBe(
        SpecialPropertyName.Pie16BackgroundColor,
      )
    })

    it('should return fallback string for invalid indices', () => {
      expect(getPieBackgroundColorViewModelProp(0)).toBe('pie0BackgroundColor')
      expect(getPieBackgroundColorViewModelProp(17)).toBe(
        'pie17BackgroundColor',
      )
      expect(getPieBackgroundColorViewModelProp(-1)).toBe(
        'pie-1BackgroundColor',
      )
    })

    it('should handle all valid indices in range', () => {
      for (let i = 1; i <= 16; i++) {
        const result = getPieBackgroundColorViewModelProp(i)
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
        if (i <= 16) {
          expect(result).toContain(`pie${i}BackgroundColor`)
        }
      }
    })
  })

  describe('getPieBackgroundSizeViewModelProp', () => {
    it('should return correct property names for valid indices', () => {
      expect(getPieBackgroundSizeViewModelProp(1)).toBe(
        SpecialPropertyName.Pie1BackgroundSize,
      )
      expect(getPieBackgroundSizeViewModelProp(8)).toBe(
        SpecialPropertyName.Pie8BackgroundSize,
      )
      expect(getPieBackgroundSizeViewModelProp(16)).toBe(
        SpecialPropertyName.Pie16BackgroundSize,
      )
    })

    it('should return fallback string for invalid indices', () => {
      expect(getPieBackgroundSizeViewModelProp(0)).toBe('pie0BackgroundSize')
      expect(getPieBackgroundSizeViewModelProp(17)).toBe('pie17BackgroundSize')
      expect(getPieBackgroundSizeViewModelProp(-1)).toBe('pie-1BackgroundSize')
    })

    it('should handle all valid indices in range', () => {
      for (let i = 1; i <= 16; i++) {
        const result = getPieBackgroundSizeViewModelProp(i)
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
        if (i <= 16) {
          expect(result).toContain(`pie${i}BackgroundSize`)
        }
      }
    })
  })

  describe('getCustomGraphicsPropertyKeys', () => {
    it('should return all custom graphics property keys', () => {
      const keys = getCustomGraphicsPropertyKeys()

      expect(Array.isArray(keys)).toBe(true)
      expect(keys.length).toBeGreaterThan(0)
    })

    it('should include main pie chart properties', () => {
      const keys = getCustomGraphicsPropertyKeys()

      expect(keys).toContain(SpecialPropertyName.PieSize)
      expect(keys).toContain(SpecialPropertyName.PieStartAngle)
      expect(keys).toContain(SpecialPropertyName.PieHole)
    })

    it('should include all pie background color properties (1-16)', () => {
      const keys = getCustomGraphicsPropertyKeys()

      for (let i = 1; i <= 16; i++) {
        const colorProp = getPieBackgroundColorViewModelProp(i)
        expect(keys).toContain(colorProp)
      }
    })

    it('should include all pie background size properties (1-16)', () => {
      const keys = getCustomGraphicsPropertyKeys()

      for (let i = 1; i <= 16; i++) {
        const sizeProp = getPieBackgroundSizeViewModelProp(i)
        expect(keys).toContain(sizeProp)
      }
    })

    it('should have correct total count of properties', () => {
      const keys = getCustomGraphicsPropertyKeys()
      // 3 main properties + 16 color properties + 16 size properties + 3 image properties = 38
      expect(keys.length).toBe(38)
    })

    it('should include image properties', () => {
      const keys = getCustomGraphicsPropertyKeys()
      expect(keys).toContain(SpecialPropertyName.BackgroundImage)
      expect(keys).toContain(SpecialPropertyName.BackgroundFit)
      expect(keys).toContain(SpecialPropertyName.BackgroundImageCrossorigin)
    })

    it('should not have duplicate keys', () => {
      const keys = getCustomGraphicsPropertyKeys()
      const uniqueKeys = new Set(keys)
      expect(keys.length).toBe(uniqueKeys.size)
    })
  })

  describe('getCustomGraphicNodeVps', () => {
    it('should filter and return custom graphic visual properties', () => {
      const visualStyle = createVisualStyle()
      const allVps = Object.values(visualStyle)

      const customGraphicVps = getCustomGraphicNodeVps(allVps)

      expect(Array.isArray(customGraphicVps)).toBe(true)
      customGraphicVps.forEach((vp) => {
        expect(vp.name.startsWith('nodeImageChart')).toBe(true)
      })
    })

    it('should return sorted custom graphic properties', () => {
      const visualStyle = createVisualStyle()
      const allVps = Object.values(visualStyle)

      const customGraphicVps = getCustomGraphicNodeVps(allVps)

      if (customGraphicVps.length > 1) {
        for (let i = 0; i < customGraphicVps.length - 1; i++) {
          const nameA = customGraphicVps[i].name
          const nameB = customGraphicVps[i + 1].name
          expect(nameA.localeCompare(nameB)).toBeLessThanOrEqual(0)
        }
      }
    })

    it('should return empty array when no custom graphic properties exist', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: 'nodeShape' as any,
          group: 'node' as any,
          displayName: 'Shape',
          type: 'nodeShape' as any,
          defaultValue: 'round-rectangle',
          bypassMap: new Map(),
        },
      ]

      const result = getCustomGraphicNodeVps(vps)

      expect(result).toEqual([])
    })
  })

  describe('getNonCustomGraphicVps', () => {
    it('should filter out custom graphic visual properties', () => {
      const visualStyle = createVisualStyle()
      const allVps = Object.values(visualStyle)

      const nonCustomGraphicVps = getNonCustomGraphicVps(allVps)

      expect(Array.isArray(nonCustomGraphicVps)).toBe(true)
      nonCustomGraphicVps.forEach((vp) => {
        expect(vp.name.startsWith('nodeImageChart')).toBe(false)
      })
    })

    it('should include all non-custom-graphic properties', () => {
      const visualStyle = createVisualStyle()
      const allVps = Object.values(visualStyle)

      const nonCustomGraphicVps = getNonCustomGraphicVps(allVps)

      expect(nonCustomGraphicVps.some((vp) => vp.name === 'nodeShape')).toBe(
        true,
      )
      expect(
        nonCustomGraphicVps.some((vp) => vp.name === 'nodeBackgroundColor'),
      ).toBe(true)
    })
  })

  describe('getFirstValidCustomGraphicVp', () => {
    it('should return empty graphic (None) when only default custom graphics exist', () => {
      const visualStyle = createVisualStyle()
      const allVps = Object.values(visualStyle)

      const result = getFirstValidCustomGraphicVp(allVps)

      // Default custom graphics are 'none', so should return the first None graphic
      expect(result).toBeDefined()
      if (result) {
        expect((result.defaultValue as CustomGraphicsType).name).toBe(
          CustomGraphicsNameType.None,
        )
      }
    })

    it('should return first valid custom graphic with pie chart', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: NodeVisualPropertyName.NodeImageChart1,
          group: 'node' as any,
          displayName: 'Chart 1',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'chart',
            name: CustomGraphicsNameType.PieChart,
            properties: {} as PieChartPropertiesType,
          } as CustomGraphicsType,
          bypassMap: new Map(),
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      expect(result).toBeDefined()
      if (result) {
        expect(result.name).toBe(NodeVisualPropertyName.NodeImageChart1)
      }
    })

    it('should return first valid custom graphic with ring chart', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: NodeVisualPropertyName.NodeImageChart1,
          group: 'node' as any,
          displayName: 'Chart 1',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'chart',
            name: CustomGraphicsNameType.RingChart,
            properties: {} as RingChartPropertiesType,
          } as CustomGraphicsType,
          bypassMap: new Map(),
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      expect(result).toBeDefined()
    })

    it('should return first valid custom graphic with image', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: NodeVisualPropertyName.NodeImageChart1,
          group: 'node' as any,
          displayName: 'Chart 1',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'image',
            name: CustomGraphicsNameType.Image,
            properties: {},
          } as CustomGraphicsType,
          bypassMap: new Map(),
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      expect(result).toBeDefined()
    })

    it('should return empty graphic (None) when no preferred graphics are valid', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: NodeVisualPropertyName.NodeImageChart1,
          group: 'node' as any,
          displayName: 'Chart 1',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'none',
            name: CustomGraphicsNameType.None,
            properties: {},
          } as CustomGraphicsType,
          bypassMap: new Map(),
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      expect(result).toBeDefined()
      if (result) {
        expect(result.name).toBe(NodeVisualPropertyName.NodeImageChart1)
        expect((result.defaultValue as CustomGraphicsType).name).toBe(
          CustomGraphicsNameType.None,
        )
      }
    })

    it('should return undefined when no valid or empty graphics exist', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: 'nodeShape' as any,
          group: 'node' as any,
          displayName: 'Shape',
          type: 'nodeShape' as any,
          defaultValue: 'round-rectangle',
          bypassMap: new Map(),
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      expect(result).toBeUndefined()
    })

    it('should validate bypass map values', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: NodeVisualPropertyName.NodeImageChart1,
          group: 'node' as any,
          displayName: 'Chart 1',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'chart',
            name: CustomGraphicsNameType.PieChart,
            properties: {} as PieChartPropertiesType,
          } as CustomGraphicsType,
          bypassMap: new Map([
            [
              'id1',
              {
                type: 'chart',
                name: CustomGraphicsNameType.RingChart,
                properties: {} as RingChartPropertiesType,
              } as CustomGraphicsType,
            ],
          ]),
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      expect(result).toBeDefined()
    })

    it('should reject invalid bypass map values', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: NodeVisualPropertyName.NodeImageChart1,
          group: 'node' as any,
          displayName: 'Chart 1',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'chart',
            name: CustomGraphicsNameType.PieChart,
            properties: {} as PieChartPropertiesType,
          } as CustomGraphicsType,
          bypassMap: new Map([
            [
              'id1',
              {
                type: 'none',
                name: CustomGraphicsNameType.None,
                properties: {},
              } as CustomGraphicsType,
            ],
          ]),
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      // Should not return this because bypass has None type
      expect(result).toBeUndefined()
    })

    it('should return valid custom graphic with passthrough mapping even if default is None', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: NodeVisualPropertyName.NodeImageChart1,
          group: 'node' as any,
          displayName: 'Chart 1',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'none',
            name: CustomGraphicsNameType.None,
            properties: {},
          } as CustomGraphicsType,
          bypassMap: new Map(),
          mapping: {
            type: MappingFunctionType.Passthrough,
            attribute: 'image',
            visualPropertyType: 'customGraphic' as any,
            defaultValue: { type: 'none', name: 'none', properties: {} } as any,
          } as any,
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      expect(result).toBeDefined()
      if (result) {
        expect(result.name).toBe(NodeVisualPropertyName.NodeImageChart1)
      }
    })

    it('should prefer explicit default over passthrough', () => {
      const vps: VisualProperty<VisualPropertyValueType>[] = [
        {
          name: NodeVisualPropertyName.NodeImageChart1,
          group: 'node' as any,
          displayName: 'Chart 1',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'chart',
            name: CustomGraphicsNameType.PieChart,
            properties: {} as any,
          } as CustomGraphicsType,
          bypassMap: new Map(),
        },
        {
          name: NodeVisualPropertyName.NodeImageChart2,
          group: 'node' as any,
          displayName: 'Chart 2',
          type: 'customGraphic' as any,
          defaultValue: {
            type: 'none',
            name: CustomGraphicsNameType.None,
            properties: {},
          } as CustomGraphicsType,
          bypassMap: new Map(),
          mapping: {
            type: MappingFunctionType.Passthrough,
            attribute: 'image',
            visualPropertyType: 'customGraphic' as any,
            defaultValue: { type: 'none', name: 'none', properties: {} } as any,
          } as any,
        },
      ]

      const result = getFirstValidCustomGraphicVp(vps)

      expect(result).toBeDefined()
      if (result) {
        expect(result.name).toBe(NodeVisualPropertyName.NodeImageChart1)
      }
    })
  })

  describe('getSizePropertyForCustomGraphic', () => {
    it('should find size property for custom graphic', () => {
      const visualStyle = createVisualStyle()
      const chartVp = visualStyle.nodeImageChart1
      const allVps = Object.values(visualStyle)

      const sizeVp = getSizePropertyForCustomGraphic(chartVp, allVps)

      expect(sizeVp).toBeDefined()
      expect(sizeVp.name).toBe('nodeImageChartSize1')
    })

    it('should extract last character from custom graphic name', () => {
      const visualStyle = createVisualStyle()
      const chartVp = visualStyle.nodeImageChart3
      const allVps = Object.values(visualStyle)

      const sizeVp = getSizePropertyForCustomGraphic(chartVp, allVps)

      expect(sizeVp).toBeDefined()
      expect(sizeVp.name).toBe('nodeImageChartSize3')
    })
  })

  describe('computePieChartProperties', () => {
    it('should return empty array when cy_dataColumns is missing or empty', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.PieChart,
        properties: {
          cy_dataColumns: [],
        } as unknown as PieChartPropertiesType,
      }
      const row = {}
      const widthVp = { defaultValue: 100 } as any
      const heightVp = { defaultValue: 100 } as any
      const mappers = new Map()

      const resultEmpty = computePieChartProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )
      expect(resultEmpty).toEqual([])

      const valueUndefined = {
        ...value,
        properties: {} as unknown as PieChartPropertiesType,
      }
      const resultUndefined = computePieChartProperties(
        id,
        valueUndefined,
        row,
        widthVp,
        heightVp,
        mappers,
      )
      expect(resultUndefined).toEqual([])
    })

    it('should compute pie chart properties from data', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.PieChart,
        properties: {
          cy_range: [0, 100],
          cy_colorScheme: 'test',
          cy_startAngle: 0,
          cy_colors: ['#FF0000', '#00FF00', '#0000FF'],
          cy_dataColumns: ['col1', 'col2', 'col3'],
        } as PieChartPropertiesType,
      }
      const row = {
        col1: 10,
        col2: 20,
        col3: 30,
      }
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computePieChartProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Should have pieSize property
      const pieSize = result.find(([name]) => name === 'pieSize')
      expect(pieSize).toBeDefined()
    })

    it('should calculate percentages from data values', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.PieChart,
        properties: {
          cy_range: [0, 100],
          cy_colorScheme: 'test',
          cy_startAngle: 0,
          cy_colors: ['#FF0000', '#00FF00'],
          cy_dataColumns: ['col1', 'col2'],
        } as PieChartPropertiesType,
      }
      const row = {
        col1: 25,
        col2: 75,
      }
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computePieChartProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(result.length).toBeGreaterThan(0)
      // Should have color and size properties for each slice
      const colorProps = result.filter(([name]) =>
        name.includes('BackgroundColor'),
      )
      expect(colorProps.length).toBeGreaterThan(0)
    })

    it('should handle division by zero when all values are zero', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.PieChart,
        properties: {
          cy_range: [0, 100],
          cy_colorScheme: 'test',
          cy_startAngle: 0,
          cy_colors: ['#FF0000', '#00FF00', '#0000FF'],
          cy_dataColumns: ['col1', 'col2', 'col3'],
        } as PieChartPropertiesType,
      }
      const row = {
        col1: 0,
        col2: 0,
        col3: 0,
      }
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computePieChartProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
      // Should have size properties for each slice
      const sizeProps = result.filter(([name]) =>
        name.includes('BackgroundSize'),
      )
      expect(sizeProps.length).toBe(3)
      // Each slice should get equal percentage (100% / 3 = 33.33%)
      sizeProps.forEach(([, sizeValue]) => {
        expect(sizeValue).toMatch(/^\d+\.?\d*%$/)
        const percentage = parseFloat(sizeValue as string)
        expect(percentage).toBeCloseTo(33.33, 1)
        expect(isNaN(percentage)).toBe(false)
      })
    })

    it('should handle missing attributes in row data', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.PieChart,
        properties: {
          cy_range: [0, 100],
          cy_colorScheme: 'test',
          cy_startAngle: 0,
          cy_colors: ['#FF0000', '#00FF00'],
          cy_dataColumns: ['col1', 'col2'],
        } as PieChartPropertiesType,
      }
      const row = {} // Missing attributes
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computePieChartProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
      const sizeProps = result.filter(([name]) =>
        name.includes('BackgroundSize'),
      )
      expect(sizeProps.length).toBe(2)
      // Each slice should get equal percentage (100% / 2 = 50%)
      sizeProps.forEach(([, sizeValue]) => {
        expect(sizeValue).toMatch(/^\d+\.?\d*%$/)
        const percentage = parseFloat(sizeValue as string)
        expect(percentage).toBeCloseTo(50, 1)
        expect(isNaN(percentage)).toBe(false)
      })
    })
  })

  describe('computeRingChartProperties', () => {
    it('should return empty array when cy_dataColumns is missing or empty', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.RingChart,
        properties: {
          cy_dataColumns: [],
        } as unknown as RingChartPropertiesType,
      }
      const row = {}
      const widthVp = { defaultValue: 100 } as any
      const heightVp = { defaultValue: 100 } as any
      const mappers = new Map()

      const resultEmpty = computeRingChartProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )
      expect(resultEmpty).toEqual([])

      const valueUndefined = {
        ...value,
        properties: {} as unknown as RingChartPropertiesType,
      }
      const resultUndefined = computeRingChartProperties(
        id,
        valueUndefined,
        row,
        widthVp,
        heightVp,
        mappers,
      )
      expect(resultUndefined).toEqual([])
    })

    it('should compute ring chart properties from data', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.RingChart,
        properties: {
          cy_range: [0, 100],
          cy_colorScheme: 'test',
          cy_holeSize: 0.4,
          cy_startAngle: 0,
          cy_colors: ['#FF0000', '#00FF00'],
          cy_dataColumns: ['col1', 'col2'],
        } as RingChartPropertiesType,
      }
      const row = {
        col1: 50,
        col2: 50,
      }
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computeRingChartProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Should have pieSize and pieHole properties
      const pieSize = result.find(([name]) => name === 'pieSize')
      const pieHole = result.find(([name]) => name === 'pieHole')
      expect(pieSize).toBeDefined()
      expect(pieHole).toBeDefined()
    })

    it('should handle division by zero when all values are zero', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.RingChart,
        properties: {
          cy_range: [0, 100],
          cy_colorScheme: 'test',
          cy_holeSize: 0.4,
          cy_startAngle: 0,
          cy_colors: ['#FF0000', '#00FF00'],
          cy_dataColumns: ['col1', 'col2'],
        } as RingChartPropertiesType,
      }
      const row = {
        col1: 0,
        col2: 0,
      }
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computeRingChartProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
      const sizeProps = result.filter(([name]) =>
        name.includes('BackgroundSize'),
      )
      expect(sizeProps.length).toBe(2)
      // Each slice should get equal percentage (100% / 2 = 50%)
      sizeProps.forEach(([, sizeValue]) => {
        expect(sizeValue).toMatch(/^\d+\.?\d*%$/)
        const percentage = parseFloat(sizeValue as string)
        expect(percentage).toBeCloseTo(50, 1)
        expect(isNaN(percentage)).toBe(false)
      })
    })
  })

  describe('computeImageProperties', () => {
    it('should compute image properties from URL', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'image',
        name: CustomGraphicsNameType.Image,
        properties: {
          url: 'http://example.com/img.png',
        },
      }
      const row = {}
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computeImageProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      const bgImage = result.find(
        ([name]) => name === SpecialPropertyName.BackgroundImage,
      )
      expect(bgImage).toBeDefined()
      expect(bgImage?.[1]).toBe('http://example.com/img.png')
    })

    it('should return empty array if URL is missing', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'image',
        name: CustomGraphicsNameType.Image,
        properties: {},
      }
      const row = {}
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computeImageProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(result).toEqual([])
    })

    describe('SVG sizing wrapper', () => {
      // 120x80 slot, so the inner SVG is drawn 80x80 and offset 20 in x and 0 in
      // y to sit centered in the outer box.
      const sizeVp = (name: string, defaultValue: number) => ({
        name: name as any,
        group: 'node' as any,
        displayName: name,
        type: 'number' as any,
        defaultValue,
        bypassMap: new Map(),
      })

      const bgImageFor = (url: string): string => {
        const result = computeImageProperties(
          '1',
          {
            type: 'image',
            name: CustomGraphicsNameType.SVGImage,
            properties: { url },
          },
          {},
          sizeVp('nodeWidth', 120),
          sizeVp('nodeHeight', 80),
          new Map(),
        )
        const bgImage = result.find(
          ([name]) => name === SpecialPropertyName.BackgroundImage,
        )
        expect(bgImage).toBeDefined()
        const encoded = bgImage![1] as string
        return decodeURIComponent(encoded.replace('data:image/svg+xml,', ''))
      }

      const innerSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
        '<circle cx="50" cy="50" r="40" fill="red" /></svg>'

      const expectWrapped = (decoded: string) => {
        // Outer box matches the slot, which keeps Cytoscape's image offset at
        // zero (no zoom drift).
        expect(decoded).toContain('viewBox="0 0 120 80"')
        expect(decoded).toContain('width="120" height="80"')
        // The source scales to fit that box while keeping its own aspect ratio.
        // It used to be dropped into a min(width, height) square at natural
        // size, which cropped this 100x100 source inside an 80x80 viewport.
        expect(decoded).toContain('viewBox="0 0 100 100"')
        expect(decoded).toContain('width="100%" height="100%"')
        expect(decoded).toContain('preserveAspectRatio="xMidYMid meet"')
        expect(decoded).toContain(
          '<circle cx="50" cy="50" r="40" fill="red" />',
        )
      }

      it('wraps a percent-encoded SVG data URI', () => {
        expectWrapped(
          bgImageFor('data:image/svg+xml,' + encodeURIComponent(innerSvg)),
        )
      })

      it('wraps a base64 SVG data URI', () => {
        expectWrapped(bgImageFor('data:image/svg+xml;base64,' + btoa(innerSvg)))
      })

      it('wraps raw SVG markup by promoting it to a data URI first', () => {
        expectWrapped(bgImageFor(`  ${innerSvg}`))
      })

      it('leaves a raster URL untouched', () => {
        const result = computeImageProperties(
          '1',
          {
            type: 'image',
            name: CustomGraphicsNameType.Image,
            properties: { url: 'https://example.com/a.png' },
          },
          {},
          sizeVp('nodeWidth', 120),
          sizeVp('nodeHeight', 80),
          new Map(),
        )
        const bgImage = result.find(
          ([name]) => name === SpecialPropertyName.BackgroundImage,
        )
        expect(bgImage?.[1]).toBe('https://example.com/a.png')
      })
    })
  })

  describe('computeCustomGraphicsProperties', () => {
    it('should compute properties for pie chart', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.PieChart,
        properties: {
          cy_range: [0, 100],
          cy_colorScheme: 'test',
          cy_startAngle: 0,
          cy_colors: ['#FF0000'],
          cy_dataColumns: ['col1'],
        } as PieChartPropertiesType,
      }
      const row = { col1: 100 }
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computeCustomGraphicsProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
    })

    it('should compute properties for ring chart', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'chart',
        name: CustomGraphicsNameType.RingChart,
        properties: {
          cy_range: [0, 100],
          cy_colorScheme: 'test',
          cy_holeSize: 0.4,
          cy_startAngle: 0,
          cy_colors: ['#FF0000'],
          cy_dataColumns: ['col1'],
        } as RingChartPropertiesType,
      }
      const row = { col1: 100 }
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computeCustomGraphicsProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
    })

    it('should compute properties for image type', () => {
      const id = '1'
      const value: CustomGraphicsType = {
        type: 'image',
        name: CustomGraphicsNameType.Image,
        properties: {
          url: 'http://example.com/img.png',
        },
      }
      const row = {}
      const widthVp = {
        name: 'nodeWidth' as any,
        group: 'node' as any,
        displayName: 'Width',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const heightVp = {
        name: 'nodeHeight' as any,
        group: 'node' as any,
        displayName: 'Height',
        type: 'number' as any,
        defaultValue: 100,
        bypassMap: new Map(),
      }
      const mappers = new Map()

      const result = computeCustomGraphicsProperties(
        id,
        value,
        row,
        widthVp,
        heightVp,
        mappers,
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
