/**
 * Visual Style Model Converter from CX2
 *
 * Converts CX2 format data to VisualStyleModel.
 */
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'

import { logModel } from '../../../../debug'

import { ValueType } from '../../../TableModel'
import {
  Bypass,
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../VisualStyleModel'
import {
  CXId,
  CXVisualMappingFunction,
  CXVisualPropertyConverter,
  cxVisualPropertyConverter,
  CXVisualPropertyValue,
} from '../../../VisualStyleModel/impl/cxVisualPropertyConverter'
import {
  getDefaultVisualStyle,
} from '../../../VisualStyleModel/impl/defaultVisualStyle'
import {
  edgeVisualProperties,
  networkVisualProperties,
  nodeVisualProperties,
} from '../../../VisualStyleModel/impl/visualStyleFnImpl'
import { VisualStyleOptions } from '../../../VisualStyleModel/VisualStyleOptions'
import { Cx2 } from '../../Cx2'
import * as cxUtil from '../extractor'
import { translateCXEdgeId } from './networkConverter'

/**
 * Create a visual style from CX2 format
 *
 * @param cx - CX2 data object
 * @returns VisualStyle instance
 */
export const createVisualStyleFromCx = (cx: Cx2): VisualStyle => {
  const visualStyle: VisualStyle = getDefaultVisualStyle()
  const visualProperties = cxUtil.getVisualProperties(cx)
  const nodeBypasses = cxUtil.getNodeBypasses(cx) ?? []
  const edgeBypasses = cxUtil.getEdgeBypasses(cx) ?? []
  const defaultNodeProperties =
    visualProperties.visualProperties[0]?.default?.node ?? {}
  const defaultEdgeProperties =
    visualProperties.visualProperties[0]?.default?.edge ?? {}
  const defaultNetworkProperties =
    visualProperties.visualProperties[0]?.default?.network ?? {}
  const nodeMapping = visualProperties.visualProperties[0]?.nodeMapping ?? {}
  const edgeMapping = visualProperties.visualProperties[0]?.edgeMapping ?? {}

  const nodeBypassMap: Map<
    VisualPropertyName,
    Bypass<VisualPropertyValueType>
  > = new Map()
  const edgeBypassMap: Map<
    VisualPropertyName,
    Bypass<VisualPropertyValueType>
  > = new Map()

  // group bypasses by visual property instead of by element
  nodeBypasses?.nodeBypasses?.forEach(
    (entry: { id: CXId; v: Record<string, object> }) => {
      const { id, v } = entry ?? {}
      // validateCX2 does not inspect bypass payloads — a malformed entry
      // must not crash the conversion (REVIEW.md R2-19)
      if (id == null || v == null || typeof v !== 'object') {
        logModel.warn(
          '[visualStyleConverter] Skipping malformed node bypass entry:',
          entry,
        )
        return
      }
      Object.keys(v).forEach((cxVPName) => {
        const entry = Object.entries(cxVisualPropertyConverter).find(
          ([, cxVPConverter]) => cxVPConverter.cxVPName === cxVPName,
        )

        if (entry != null) {
          const [vpName, cxVPConverter] = entry as [
            VisualPropertyName,
            CXVisualPropertyConverter<VisualPropertyValueType>,
          ]

          if (nodeBypassMap.has(vpName)) {
            const entry = nodeBypassMap.get(vpName) ?? new Map()
            entry.set(
              String(id),
              cxVPConverter.valueConverter(
                v[cxVPName] as CXVisualPropertyValue,
              ),
            )
            nodeBypassMap.set(vpName, entry)
          } else {
            nodeBypassMap.set(
              vpName,
              new Map().set(
                String(id),
                cxVPConverter.valueConverter(
                  v[cxVPName] as CXVisualPropertyValue,
                ),
              ),
            )
          }
        }
      })
    },
  )

  // group bypasses by visual property instead of by element
  edgeBypasses?.edgeBypasses?.forEach(
    (entry: { id: CXId; v: Record<string, object> }) => {
      const { id, v } = entry ?? {}
      if (id == null || v == null || typeof v !== 'object') {
        logModel.warn(
          '[visualStyleConverter] Skipping malformed edge bypass entry:',
          entry,
        )
        return
      }
      Object.keys(v).forEach((cxVPName) => {
        const entry = Object.entries(cxVisualPropertyConverter).find(
          ([, cxVPConverter]) => cxVPConverter.cxVPName === cxVPName,
        )

        if (entry != null) {
          const [vpName, cxVPConverter] = entry as [
            VisualPropertyName,
            CXVisualPropertyConverter<VisualPropertyValueType>,
          ]

          if (edgeBypassMap.has(vpName)) {
            const entry = edgeBypassMap.get(vpName) ?? new Map()
            entry.set(
              translateCXEdgeId(String(id)),
              cxVPConverter.valueConverter(
                v[cxVPName] as CXVisualPropertyValue,
              ),
            )
            edgeBypassMap.set(vpName, entry)
          } else {
            edgeBypassMap.set(
              vpName,
              new Map().set(
                translateCXEdgeId(String(id)),
                cxVPConverter.valueConverter(
                  v[cxVPName] as CXVisualPropertyValue,
                ),
              ),
            )
          }
        }
      })
    },
  )

  const vpGroups = [
    {
      vps: nodeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultNodeProperties[cxVPName],
      getMapping: (
        cxVPName: string,
      ): CXVisualMappingFunction<CXVisualPropertyValue> | null =>
        nodeMapping[cxVPName] as CXVisualMappingFunction<CXVisualPropertyValue>,
      getBypass: (): Map<VisualPropertyName, Bypass<VisualPropertyValueType>> =>
        nodeBypassMap,
    },
    {
      vps: edgeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultEdgeProperties[cxVPName],
      getMapping: (
        cxVPName: string,
      ): CXVisualMappingFunction<CXVisualPropertyValue> | null =>
        edgeMapping?.[
          cxVPName
        ] as CXVisualMappingFunction<CXVisualPropertyValue>,
      getBypass: (): Map<VisualPropertyName, Bypass<VisualPropertyValueType>> =>
        edgeBypassMap,
    },
    {
      vps: networkVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultNetworkProperties[cxVPName],
      getMapping: () => null,
      getBypass: () => new Map(), // no mappings or bypasses for network vps
    },
  ]

  vpGroups.forEach((group) => {
    const { vps, getDefault, getMapping, getBypass } = group
    vps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
      const { name: vpName } = vp
      const converter = cxVisualPropertyConverter[vpName]

      const isSupportedCXProperty = converter != null

      if (isSupportedCXProperty) {
        const cxDefault = getDefault(
          converter.cxVPName,
        ) as CXVisualPropertyValue
        const cxMapping = getMapping(converter.cxVPName)
        const cxBypass = getBypass()

        if (cxDefault != null) {
          visualStyle[vpName].defaultValue = converter.valueConverter(cxDefault)
        }

        // Mappings without a definition cannot be converted; validateCX2
        // does not inspect mapping shapes, so this must not throw
        // (REVIEW.md R2-19)
        if (cxMapping != null && cxMapping.definition == null) {
          logModel.warn(
            `[visualStyleConverter] Skipping ${cxMapping.type} mapping for ${vpName}: missing definition`,
          )
        } else if (cxMapping != null) {
          switch (cxMapping.type) {
            case 'PASSTHROUGH': {
              const m: PassthroughMappingFunction = {
                type: MappingFunctionType.Passthrough,
                visualPropertyType: vp.type,
                attribute: cxMapping.definition.attribute,
                defaultValue: vp.defaultValue,
                attributeType: cxMapping.definition.type,
              }
              visualStyle[vpName].mapping = m
              break
            }
            case 'DISCRETE': {
              const vpValueMap = new Map()
              const mapEntries = cxMapping?.definition?.map ?? []
              mapEntries.forEach((mapEntry) => {
                const { v, vp } = mapEntry
                vpValueMap.set(v, converter.valueConverter(vp))
              })
              const m: DiscreteMappingFunction = {
                type: MappingFunctionType.Discrete,
                attribute: cxMapping.definition.attribute,
                vpValueMap,
                visualPropertyType: vp.type,
                defaultValue: vp.defaultValue,
                attributeType: cxMapping.definition.type,
              }
              visualStyle[vpName].mapping = m
              break
            }
            case 'CONTINUOUS': {
              const numMapEntries = cxMapping?.definition?.map?.length ?? 0
              if (numMapEntries < 2) {
                logModel.warn(
                  `[visualStyleConverter] Skipping continuous mapping for ${vpName}: only ${numMapEntries} map entries`,
                )
                visualStyle[vpName].mapping = undefined
                break
              }

              let min = null
              let max = null
              let ltMinVpValue: VisualPropertyValueType | null = null
              let gtMaxVpValue: VisualPropertyValueType | null = null

              if (
                cxMapping.definition.map[0].max != null &&
                cxMapping.definition.map[0].maxVPValue != null
              ) {
                const outOfBoundsVal = cxMapping.definition.map[0].maxVPValue
                const inBoundsVal = numMapEntries > 2 ? cxMapping.definition.map[1].minVPValue : outOfBoundsVal
                
                ltMinVpValue = converter.valueConverter(outOfBoundsVal as CXVisualPropertyValue)
                min = {
                  value: cxMapping.definition.map[0].max as ValueType,
                  vpValue: converter.valueConverter(inBoundsVal as CXVisualPropertyValue),
                  inclusive: cxMapping.definition.map[0].includeMax,
                }
              }

              if (
                cxMapping.definition.map[numMapEntries - 1].min != null &&
                cxMapping.definition.map[numMapEntries - 1].minVPValue != null
              ) {
                const outOfBoundsVal = cxMapping.definition.map[numMapEntries - 1].minVPValue
                const inBoundsVal = numMapEntries > 2 ? cxMapping.definition.map[numMapEntries - 2].maxVPValue : outOfBoundsVal
                
                gtMaxVpValue = converter.valueConverter(outOfBoundsVal as CXVisualPropertyValue)
                max = {
                  value: cxMapping.definition.map[numMapEntries - 1]
                    .min as ValueType,
                  vpValue: converter.valueConverter(inBoundsVal as CXVisualPropertyValue),
                  inclusive:
                    cxMapping.definition.map[numMapEntries - 1].includeMin,
                }
              }

              const controlPoints: ContinuousFunctionControlPoint[] = []

              // only iterate through the middle entries of the map
              // i.e. exclue min and max
              for (let i = 1; i <= numMapEntries - 2; i++) {
                const mapEntry = cxMapping.definition.map[i]
                if (mapEntry.minVPValue != null && mapEntry.min != null) {
                  controlPoints.push({
                    value: mapEntry.min as ValueType,
                    vpValue: converter.valueConverter(
                      mapEntry.minVPValue as CXVisualPropertyValue,
                    ),
                  })
                }

                if (mapEntry.maxVPValue != null && mapEntry.max != null) {
                  controlPoints.push({
                    value: mapEntry.max as ValueType,
                    vpValue: converter.valueConverter(
                      mapEntry.maxVPValue as CXVisualPropertyValue,
                    ),
                  })
                }
              }

              const uniqueCtrlPts = uniqWith(controlPoints, isEqual)

              const sortedCtrlPts = Array.from(uniqueCtrlPts).sort(
                (a, b) => (a.value as number) - (b.value as number),
              )

              // A 2-entry map (min + max, no middle control points) is a
              // valid continuous mapping — do not require controlPoints
              // (REVIEW.md R2-20)
              if (min != null && max != null) {
                const m: ContinuousMappingFunction = {
                  type: MappingFunctionType.Continuous,
                  attribute: cxMapping.definition.attribute,
                  min,
                  max,
                  controlPoints: sortedCtrlPts,
                  visualPropertyType: vp.type,
                  defaultValue: vp.defaultValue,
                  gtMaxVpValue: gtMaxVpValue ?? max.vpValue,
                  ltMinVpValue: ltMinVpValue ?? min.vpValue,
                  attributeType: cxMapping.definition.type,
                }
                visualStyle[vpName].mapping = m
              } else {
                logModel.warn(
                  `[visualStyleConverter] Skipping continuous mapping for ${vpName}: boundary entries lack min/max values`,
                )
              }
              break
            }
            default:
              break
          }
        }

        visualStyle[vpName].bypassMap = cxBypass.get(vpName) ?? new Map()
      } else {
        // property is not found in cx, in theory all cytoscape web properties should be in
        // cx, if this happens, it is a bug
        logModel.info(
          `[${createVisualStyleFromCx.name}]: Property ${vpName} not found in CX`,
        )
      }
    })
  })

  return visualStyle
}

/**
 * Create visual style options from CX2 format
 *
 * @param cx - CX2 data object
 * @returns VisualStyleOptions instance
 */
export const createVisualStyleOptionsFromCx = (cx: Cx2): VisualStyleOptions => {
  return cxUtil.getVisualEditorProperties(cx) ?? {}
}

