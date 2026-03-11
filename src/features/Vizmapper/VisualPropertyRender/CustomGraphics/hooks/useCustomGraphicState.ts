import * as React from 'react'
import { CustomGraphicsType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../../../models/VisualStyleModel/impl/defaultVisualStyle'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { useTableStore } from '../../../../../data/hooks/stores/TableStore'
import { useWorkspaceStore } from '../../../../../data/hooks/stores/WorkspaceStore'
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

  React.useEffect(() => {
    if (!open) return

    // Determine initial kind
    const initialKind: CustomGraphicKind =
      initialValue?.name === CustomGraphicsNameType.RingChart
        ? CustomGraphicsNameType.RingChart
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

  }, [open, initialValue])

  const currentProps =
    kind === CustomGraphicsNameType.PieChart ? pieProps : ringProps

  const updateCurrent = (
    newProps: PieChartPropertiesType | RingChartPropertiesType,
  ) =>
    kind === CustomGraphicsNameType.PieChart
      ? setPieProps(newProps as PieChartPropertiesType)
      : setRingProps(newProps as RingChartPropertiesType)

  // Handler to remove graphics and reset to defaults
  const handleRemoveCharts = () => {
    setPieProps(defaultPieProps)
    setRingProps(defaultRingProps)
    setKind(CustomGraphicsNameType.PieChart)
    return DEFAULT_CUSTOM_GRAPHICS
  }

  // Handle attributes and colors update (unified)
  const handleAttributesAndColorsUpdate = (
    dataColumns: AttributeName[],
    colors: ColorType[],
    colorScheme: string,
  ) => {
    updateCurrent({
      ...currentProps,
      cy_dataColumns: dataColumns,
      cy_colors: colors,
      cy_colorScheme: colorScheme,
    })
  }

  // Handle properties update
  const handlePropertiesUpdate = (startAngle: number, holeSize?: number) => {
    updateCurrent({
      ...currentProps,
      cy_startAngle: startAngle,
      ...(kind === CustomGraphicsNameType.RingChart && {
        cy_holeSize: holeSize,
      }),
    })
  }

  return {
    kind,
    setKind,
    currentProps,
    hasNumericProperties,
    handleRemoveCharts,
    handleAttributesAndColorsUpdate,
    handlePropertiesUpdate,
  }
}
