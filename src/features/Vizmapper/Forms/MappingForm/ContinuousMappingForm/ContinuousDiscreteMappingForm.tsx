import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import * as React from 'react'

import { useVisualStyleStore } from '../../../../../data/hooks/stores/VisualStyleStore'
import { useUndoStack } from '../../../../../data/hooks/useUndoStack'
import { IdType } from '../../../../../models/IdType'
import { UndoCommandType } from '../../../../../models/StoreModel/UndoStoreModel'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../../models/VisualStyleModel'
import {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
} from '../../../../../models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyValueForm } from '../../VisualPropertyValueForm'
import { ExpandableNumberInput } from './ExpandableNumberInput'

interface Point {
  value: number
  vpValue: VisualPropertyValueType
}

// CW-569: editor for a continuous (step-function) mapping on a discrete-valued
// visual property such as edge line type or node shape. The numeric attribute
// is divided into bands by the boundary values; each band renders a discrete
// visual-property value.
export function ContinuousDiscreteMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const m = props.visualProperty?.mapping as ContinuousMappingFunction | null

  const setContinuousMappingValues = useVisualStyleStore(
    (state) => state.setContinuousMappingValues,
  )
  const { postEdit } = useUndoStack()

  // Ordered boundary points: [min, ...intermediate, max].
  const initialPoints: Point[] = React.useMemo(() => {
    if (m == null) return []
    const pts: Point[] = [
      { value: m.min.value as number, vpValue: m.min.vpValue },
      ...m.controlPoints
        .filter(
          (cp) =>
            cp.value !== m.min.value && cp.value !== m.max.value,
        )
        .map((cp) => ({ value: cp.value as number, vpValue: cp.vpValue })),
      { value: m.max.value as number, vpValue: m.max.vpValue },
    ].sort((a, b) => a.value - b.value)
    return pts
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed from mapping identity only
  }, [props.visualProperty.mapping])

  const [points, setPoints] = React.useState<Point[]>(initialPoints)
  const [ltMin, setLtMin] = React.useState<VisualPropertyValueType>(
    (m?.ltMinVpValue ?? m?.min.vpValue) as VisualPropertyValueType,
  )
  const [gtMax, setGtMax] = React.useState<VisualPropertyValueType>(
    (m?.gtMaxVpValue ?? m?.max.vpValue) as VisualPropertyValueType,
  )

  React.useEffect(() => {
    setPoints(initialPoints)
    setLtMin((m?.ltMinVpValue ?? m?.min.vpValue) as VisualPropertyValueType)
    setGtMax((m?.gtMaxVpValue ?? m?.max.vpValue) as VisualPropertyValueType)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync on mapping change
  }, [props.visualProperty.mapping?.attribute])

  if (m == null) {
    return <Box></Box>
  }

  const commit = (
    nextPoints: Point[],
    nextLtMin: VisualPropertyValueType,
    nextGtMax: VisualPropertyValueType,
  ): void => {
    const sorted = [...nextPoints].sort((a, b) => a.value - b.value)
    const min: ContinuousFunctionControlPoint = {
      value: sorted[0].value,
      vpValue: sorted[0].vpValue,
      inclusive: false,
    }
    const max: ContinuousFunctionControlPoint = {
      value: sorted[sorted.length - 1].value,
      vpValue: sorted[sorted.length - 1].vpValue,
      inclusive: false,
    }
    const controlPoints: ContinuousFunctionControlPoint[] = sorted.map((p) => ({
      value: p.value,
      vpValue: p.vpValue,
    }))

    const nextMapping: ContinuousMappingFunction = {
      ...m,
      min,
      max,
      controlPoints,
      ltMinVpValue: nextLtMin,
      gtMaxVpValue: nextGtMax,
    }

    postEdit(
      UndoCommandType.SET_CONTINUOUS_MAPPING,
      `Update ${props.visualProperty.displayName} continuous mapping`,
      [
        props.currentNetworkId,
        props.visualProperty.name,
        props.visualProperty.mapping,
      ],
      [props.currentNetworkId, props.visualProperty.name, nextMapping],
    )

    setContinuousMappingValues(
      props.currentNetworkId,
      props.visualProperty.name,
      min,
      max,
      controlPoints,
      nextLtMin,
      nextGtMax,
    )
  }

  const updatePointValue = (index: number, value: number): void => {
    const next = points.map((p, i) => (i === index ? { ...p, value } : p))
    setPoints(next)
    commit(next, ltMin, gtMax)
  }

  const updatePointVpValue = (
    index: number,
    vpValue: VisualPropertyValueType,
  ): void => {
    const next = points.map((p, i) => (i === index ? { ...p, vpValue } : p))
    setPoints(next)
    commit(next, ltMin, gtMax)
  }

  const addPoint = (): void => {
    const lo = points[0].value
    const hi = points[points.length - 1].value
    const next: Point[] = [
      ...points,
      { value: (lo + hi) / 2, vpValue: points[0].vpValue },
    ].sort((a, b) => a.value - b.value)
    setPoints(next)
    commit(next, ltMin, gtMax)
  }

  const removePoint = (index: number): void => {
    const next = points.filter((_, i) => i !== index)
    setPoints(next)
    commit(next, ltMin, gtMax)
  }

  const isEndpoint = (index: number): boolean =>
    index === 0 || index === points.length - 1

  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 420 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {`Map ranges of "${m.attribute}" to ${props.visualProperty.displayName} values.`}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 0.5,
        }}
      >
        <Typography variant="caption" sx={{ minWidth: 140 }}>
          {`Below minimum`}
        </Typography>
        <VisualPropertyValueForm
          currentValue={ltMin}
          visualProperty={props.visualProperty}
          currentNetworkId={props.currentNetworkId}
          onValueChange={(newValue) => {
            setLtMin(newValue)
            commit(points, newValue, gtMax)
          }}
        />
      </Box>
      <Divider />

      {points.map((p, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">
              {index === 0
                ? 'Minimum'
                : index === points.length - 1
                  ? 'Maximum'
                  : 'Threshold'}
            </Typography>
            <ExpandableNumberInput
              value={p.value}
              onConfirm={(newVal) => updatePointValue(index, newVal)}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <VisualPropertyValueForm
              currentValue={p.vpValue}
              visualProperty={props.visualProperty}
              currentNetworkId={props.currentNetworkId}
              onValueChange={(newValue) => updatePointVpValue(index, newValue)}
            />
            {!isEndpoint(index) && (
              <Tooltip title="Remove point">
                <IconButton size="small" onClick={() => removePoint(index)}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      ))}

      <Divider />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 0.5,
        }}
      >
        <Typography variant="caption" sx={{ minWidth: 140 }}>
          {`Above maximum`}
        </Typography>
        <VisualPropertyValueForm
          currentValue={gtMax}
          visualProperty={props.visualProperty}
          currentNetworkId={props.currentNetworkId}
          onValueChange={(newValue) => {
            setGtMax(newValue)
            commit(points, ltMin, newValue)
          }}
        />
      </Box>

      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton size="small" onClick={addPoint} aria-label="add point">
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  )
}
