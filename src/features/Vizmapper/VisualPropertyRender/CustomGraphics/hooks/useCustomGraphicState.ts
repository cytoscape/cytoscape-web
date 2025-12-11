import * as React from 'react'
import { IdType } from '../../../../../models/IdType'
import { CustomGraphicsType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../../../models/VisualStyleModel/impl/defaultVisualStyle'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { ValueTypeName } from '../../../../../models/TableModel/ValueTypeName'
import { useTableStore } from '../../../../../data/hooks/stores/TableStore'
import { useWorkspaceStore } from '../../../../../data/hooks/stores/WorkspaceStore'
import { PALETTES } from '../utils/palettes'
import { pickEvenly } from '../utils/colorUtils'
import { WizardStep } from '../WizardSteps/StepProgress'
import { CustomGraphicKind } from '../WizardSteps/SelectTypeStep'

// Default properties
const defaultPieProps: PieChartPropertiesType = {
  cy_range: [0, 1],
  cy_colorScheme: '',
  cy_startAngle: 0,
  cy_colors: [] as ColorType[],
  cy_dataColumns: [] as AttributeName[],
}

const defaultRingProps: RingChartPropertiesType = {
  cy_range: [0, 1],
  cy_colorScheme: '',
  cy_startAngle: 0,
  cy_holeSize: 0.4,
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
    if (!nodeTable?.rows || !nodeTable?.columns) return false

    const rows = Array.from(nodeTable.rows.values())
    if (!rows.length) return false

    return nodeTable.columns.some((col) => {
      const vals = rows.map((r) => r[col.name])
      const allInts = vals.every((v) => Number.isInteger(v))
      const allNums = vals.every((v) => typeof v === 'number')
      const vt = allInts
        ? ValueTypeName.Integer
        : allNums
          ? ValueTypeName.Double
          : null

      return (
        vt === ValueTypeName.Integer ||
        vt === ValueTypeName.Double ||
        vt === ValueTypeName.Long
      )
    })
  }, [nodeTable])

  // Determine initial state based on whether a custom graphic exists
  const hasExistingGraphic =
    initialValue && initialValue.name !== CustomGraphicsNameType.None

  // Initialize step: if existing graphic, go to preview; otherwise start at step 0
  const initialStep = hasExistingGraphic
    ? WizardStep.Preview
    : WizardStep.SelectType

  const [currentStep, setCurrentStep] = React.useState<WizardStep>(initialStep)
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

    // Set initial step based on whether we have an existing graphic
    setCurrentStep(
      hasExistingGraphic ? WizardStep.Preview : WizardStep.SelectType,
    )
  }, [open, initialValue])

  const currentProps =
    kind === CustomGraphicsNameType.PieChart ? pieProps : ringProps

  const updateCurrent = (
    newProps: PieChartPropertiesType | RingChartPropertiesType,
  ) =>
    kind === CustomGraphicsNameType.PieChart
      ? setPieProps(newProps as PieChartPropertiesType)
      : setRingProps(newProps as RingChartPropertiesType)

  const isLastStep = currentStep === WizardStep.Preview

  // Navigation functions
  const goToNextStep = () => {
    // Prevent navigation if no numeric properties and trying to go past SelectType step
    if (currentStep === WizardStep.SelectType && !hasNumericProperties) {
      return
    }

    if (currentStep < WizardStep.Preview) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > WizardStep.SelectType) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handler to remove graphics and reset to defaults
  const handleRemoveCharts = () => {
    setPieProps(defaultPieProps)
    setRingProps(defaultRingProps)
    setKind(CustomGraphicsNameType.PieChart)
    setCurrentStep(WizardStep.SelectType)
    return DEFAULT_CUSTOM_GRAPHICS
  }

  // Handle attributes update
  const handleAttributesUpdate = (
    dataColumns: AttributeName[],
    colors: ColorType[],
  ) => {
    updateCurrent({
      ...currentProps,
      cy_dataColumns: dataColumns,
      cy_colors: colors,
    })
  }

  // Handle palette change
  const handlePaletteChange = (scheme: string) => {
    const base = PALETTES[scheme] ?? []
    const newColors = pickEvenly(
      base,
      currentProps.cy_dataColumns.length,
    ) as ColorType[]

    updateCurrent({
      ...currentProps,
      cy_colorScheme: scheme,
      cy_colors: newColors,
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
    currentStep,
    setCurrentStep,
    kind,
    setKind,
    currentProps,
    isLastStep,
    hasNumericProperties,
    goToNextStep,
    goToPreviousStep,
    handleRemoveCharts,
    handleAttributesUpdate,
    handlePaletteChange,
    handlePropertiesUpdate,
  }
}
