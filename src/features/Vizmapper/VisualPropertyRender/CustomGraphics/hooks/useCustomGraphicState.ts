import * as React from 'react'

import { useTableStore } from '../../../../../data/hooks/stores/TableStore'
import { useWorkspaceStore } from '../../../../../data/hooks/stores/WorkspaceStore'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../../../models/VisualStyleModel/impl/defaultVisualStyle'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { CustomGraphicsType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  CustomGraphicsNameType,
  isImageCustomGraphicsName,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  ImagePropertiesType,
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { hasNumericColumns } from '../utils/numericColumnUtils'
import { CustomGraphicKind } from '../WizardSteps/SelectTypeStep'

// Default properties
const defaultPieProps: PieChartPropertiesType = {
  cy_range: [0, 1],
  cy_colorScheme: '',
  cy_startAngle: 0,
  cy_colors: [] as ColorType[],
  cy_dataColumns: [] as AttributeName[],
}

import { CHART_CONSTANTS } from '../utils/constants'

const defaultRingProps: RingChartPropertiesType = {
  cy_range: [0, 1],
  cy_colorScheme: '',
  cy_startAngle: 0,
  cy_holeSize: CHART_CONSTANTS.DEFAULT_HOLE_SIZE,
  cy_colors: [] as ColorType[],
  cy_dataColumns: [] as AttributeName[],
}

const defaultImageProps: ImagePropertiesType = {
  url: '',
}

type ChartKind =
  | typeof CustomGraphicsNameType.PieChart
  | typeof CustomGraphicsNameType.RingChart

const isChartKind = (kind: CustomGraphicKind): kind is ChartKind =>
  kind === CustomGraphicsNameType.PieChart ||
  kind === CustomGraphicsNameType.RingChart

// The properties every chart kind understands. Arrays are copied so the two
// kinds never share a reference.
const pickSharedChartProperties = (
  props: PieChartPropertiesType | RingChartPropertiesType,
): Pick<
  PieChartPropertiesType,
  | 'cy_dataColumns'
  | 'cy_colors'
  | 'cy_colorScheme'
  | 'cy_range'
  | 'cy_startAngle'
> => ({
  cy_dataColumns: [...props.cy_dataColumns],
  cy_colors: [...props.cy_colors],
  cy_colorScheme: props.cy_colorScheme,
  cy_range: [props.cy_range[0], props.cy_range[1]],
  cy_startAngle: props.cy_startAngle,
})

interface UseCustomGraphicStateProps {
  open: boolean
  initialValue: CustomGraphicsType | null
}

export const useCustomGraphicState = ({
  open,
  initialValue,
}: UseCustomGraphicStateProps) => {
  // Get current network ID and node table
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const tables = useTableStore((state) => state.tables)
  const nodeTable = tables[currentNetworkId]?.nodeTable

  // Check if the current network has numeric properties in the node table
  const hasNumericProperties = React.useMemo(() => {
    return hasNumericColumns(nodeTable?.columns, nodeTable?.rows)
  }, [nodeTable])

  const [kind, setKind] = React.useState<CustomGraphicKind>(
    CustomGraphicsNameType.PieChart,
  )
  const [pieProps, setPieProps] =
    React.useState<PieChartPropertiesType>(defaultPieProps)
  const [ringProps, setRingProps] =
    React.useState<RingChartPropertiesType>(defaultRingProps)
  const [imageProps, setImageProps] =
    React.useState<ImagePropertiesType>(defaultImageProps)

  React.useEffect(() => {
    if (!open) return

    // Determine initial kind
    const initialKind: CustomGraphicKind =
      initialValue?.name === CustomGraphicsNameType.RingChart
        ? CustomGraphicsNameType.RingChart
        : initialValue && isImageCustomGraphicsName(initialValue.name)
          ? CustomGraphicsNameType.Image
          : CustomGraphicsNameType.PieChart
    setKind(initialKind)

    // Initialize pieProps
    if (initialValue?.name === CustomGraphicsNameType.PieChart) {
      const pieInit = initialValue.properties as PieChartPropertiesType
      setPieProps({
        ...defaultPieProps,
        ...pieInit,
      })
    } else {
      setPieProps(defaultPieProps)
    }

    // Initialize ringProps
    if (initialValue?.name === CustomGraphicsNameType.RingChart) {
      const ringInit = initialValue.properties as RingChartPropertiesType
      setRingProps({
        ...defaultRingProps,
        ...ringInit,
      })
    } else {
      setRingProps(defaultRingProps)
    }

    // Initialize imageProps
    if (initialValue && isImageCustomGraphicsName(initialValue.name)) {
      const imageInit = initialValue.properties as ImagePropertiesType
      setImageProps({
        ...defaultImageProps,
        ...imageInit,
      })
    } else {
      setImageProps(defaultImageProps)
    }
  }, [open, initialValue])

  // Switch the graphic kind. Between chart kinds (pie and donut) the settings
  // both share come along — the selected attributes, their colors and palette,
  // the data range and the start angle — so the user does not have to pick
  // them again; Cytoscape Desktop behaves the same way. Kind-only settings
  // (the donut's hole size) and image settings stay with their own kind.
  const selectKind = (next: CustomGraphicKind) => {
    if (next === kind) return
    if (isChartKind(kind) && isChartKind(next)) {
      const shared = pickSharedChartProperties(
        kind === CustomGraphicsNameType.PieChart ? pieProps : ringProps,
      )
      if (next === CustomGraphicsNameType.PieChart) {
        setPieProps((prev) => ({ ...prev, ...shared }))
      } else {
        setRingProps((prev) => ({ ...prev, ...shared }))
      }
    }
    setKind(next)
  }

  const currentProps =
    kind === CustomGraphicsNameType.PieChart
      ? pieProps
      : kind === CustomGraphicsNameType.RingChart
        ? ringProps
        : imageProps

  const updateCurrent = (
    newProps:
      | PieChartPropertiesType
      | RingChartPropertiesType
      | ImagePropertiesType,
  ) => {
    if (kind === CustomGraphicsNameType.PieChart) {
      setPieProps(newProps as PieChartPropertiesType)
    } else if (kind === CustomGraphicsNameType.RingChart) {
      setRingProps(newProps as RingChartPropertiesType)
    } else {
      setImageProps(newProps as ImagePropertiesType)
    }
  }

  // Handler to remove graphics and reset to defaults
  const handleRemoveCharts = () => {
    setPieProps(defaultPieProps)
    setRingProps(defaultRingProps)
    setImageProps(defaultImageProps)
    setKind(CustomGraphicsNameType.PieChart)
    return DEFAULT_CUSTOM_GRAPHICS
  }

  // Handle attributes and colors update (unified)
  const handleAttributesAndColorsUpdate = (
    dataColumns: AttributeName[],
    colors: ColorType[],
    colorScheme: string,
  ) => {
    if (kind === CustomGraphicsNameType.Image) return
    updateCurrent({
      ...currentProps,
      cy_dataColumns: dataColumns,
      cy_colors: colors,
      cy_colorScheme: colorScheme,
    })
  }

  // Handle properties update
  const handlePropertiesUpdate = (startAngle: number, holeSize?: number) => {
    if (kind === CustomGraphicsNameType.Image) return
    updateCurrent({
      ...currentProps,
      cy_startAngle: startAngle,
      ...(kind === CustomGraphicsNameType.RingChart && {
        cy_holeSize: holeSize,
      }),
    })
  }

  // Handle image URL update
  const handleImageUrlUpdate = (url: string) => {
    updateCurrent({
      ...(currentProps as ImagePropertiesType),
      url,
    })
  }

  return {
    kind,
    selectKind,
    currentProps,
    hasNumericProperties,
    handleRemoveCharts,
    handleAttributesAndColorsUpdate,
    handlePropertiesUpdate,
    handleImageUrlUpdate,
  }
}
