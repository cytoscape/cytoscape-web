import * as React from 'react'
import {
  Button,
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import Delete from '@mui/icons-material/Close'
import { scaleLinear } from 'd3-scale'
import { color } from 'd3-color'
import Draggable from 'react-draggable'

import { IdType } from '../../../../models/IdType'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { ContinuousMappingFunction } from '../../../../models/VisualStyleModel/VisualMappingFunction'
import { ValueType } from '../../../../models/TableModel'

import { VisualPropertyValueForm } from '../VisualPropertyValueForm'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'
import { ContinuousFunctionControlPoint } from '../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import { debounce } from 'lodash'
interface Handle extends ContinuousFunctionControlPoint {
  id: number
  value: ValueType
  vpValue: VisualPropertyValueType
  pixelPosition: { x: number; y: number }
}

// color mapping form for now
export function ContinuousColorMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const m: ContinuousMappingFunction | null = props.visualProperty
    ?.mapping as ContinuousMappingFunction

  if (m == null) {
    return <Box></Box>
  }
  const { min, max, controlPoints } = m

  const [minState, setMinState] = React.useState(min)
  const [maxState, setMaxState] = React.useState(max)

  const NUM_GRADIENT_STEPS = 100
  const GRADIENT_STEP_WIDTH = 4

  const setContinuousMappingValues = useVisualStyleStore(
    (state) => state.setContinuousMappingValues,
  )
  // map values in the continuous mapping range to a pixel position
  const valueToPixel = (
    domain: [number, number],
    range: [number, number],
    stepWidth: number,
    rangePosition: number,
  ): number => {
    const rangeToPixel = scaleLinear(domain, range)
    const value = rangeToPixel(rangePosition) ?? 0

    return value * stepWidth
  }

  const pixelToValue = (
    domain: [number, number],
    range: [number, number],
    pixelPosition: number,
  ): number => {
    const pixelToRange = scaleLinear(domain, range)
    const value = pixelToRange(pixelPosition) ?? 0

    return value
  }

  const [handles, setHandles] = React.useState(() => {
    return [...controlPoints]
      .sort((a, b) => (a.value as number) - (b.value as number))
      .map((pt, index) => {
        return {
          ...pt,
          id: index,
          pixelPosition: {
            x: valueToPixel(
              [minState.value as number, maxState.value as number],
              [0, NUM_GRADIENT_STEPS],
              GRADIENT_STEP_WIDTH,
              pt.value as number,
            ),
            y: 0,
          },
        }
      })
  })

  const handleIds = new Set(handles.map((h) => h.id))

  const mapper = scaleLinear(
    // domain: handle values
    [
      minState.value as number,
      ...handles.map((h) => h.value as number),
      maxState.value as number,
    ],
    // range: handle colors
    [
      minState.vpValue as string,
      ...handles.map((h) => h.vpValue as string),
      maxState.vpValue as string,
    ],
  )

  const updateContinuousMapping = React.useMemo(
    () =>
      debounce(
        (
          min: ContinuousFunctionControlPoint,
          max: ContinuousFunctionControlPoint,
          handles: Handle[],
        ) => {
          setContinuousMappingValues(
            props.currentNetworkId,
            props.visualProperty.name,
            min,
            max,
            handles.map((h) => {
              return {
                value: h.value,
                vpValue: h.vpValue,
              }
            }),
          )
        },
        200,
        { trailing: true },
      ),
    [],
  )

  React.useEffect(() => {
    // if the mapping attribute changegs, recompute the continuous mapping
    // min, max and handles
    const nextMapping = props.visualProperty
      .mapping as ContinuousMappingFunction
    const nextMin = nextMapping.min ?? minState
    const nextMax = nextMapping.max ?? maxState
    const nextControlPoints =
      nextMapping.controlPoints ?? ([] as ContinuousFunctionControlPoint[])

    setMinState(nextMin)
    setMaxState(nextMax)
    setHandles(
      [...nextControlPoints]
        .sort((a, b) => (a.value as number) - (b.value as number))
        .map((pt, index) => {
          return {
            ...pt,
            id: index,
            pixelPosition: {
              x: valueToPixel(
                [minState.value as number, maxState.value as number],
                [0, NUM_GRADIENT_STEPS],
                GRADIENT_STEP_WIDTH,
                pt.value as number,
              ),
              y: 0,
            },
          }
        }),
    )
  }, [props.visualProperty.mapping?.attribute])

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 12,
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 1,
            m: 1,
          }}
        >
          <VisualPropertyValueForm
            currentValue={minState.vpValue}
            visualProperty={props.visualProperty}
            onValueChange={(newValue) => {
              setMinState({
                ...minState,
                vpValue: newValue,
              })

              updateContinuousMapping(
                {
                  ...minState,
                  vpValue: newValue,
                },
                maxState,
                handles,
              )
            }}
          />
          <Typography variant="body2">Min</Typography>
          <TextField
            sx={{ width: 50 }}
            inputProps={{
              sx: { p: 0.5, fontSize: 14, width: 50 },
              inputMode: 'numeric',
              pattern: '[0-9]*',
              step: 0.1,
            }}
            onChange={(e) => {
              const newMin = Number(e.target.value)
              if (!isNaN(newMin)) {
                setMinState({
                  ...minState,
                  value: newMin,
                })

                const newHandles = handles.map((h) => {
                  return {
                    ...h,
                    value: pixelToValue(
                      [0, NUM_GRADIENT_STEPS],
                      [newMin, maxState.value as number],
                      h.pixelPosition.x / GRADIENT_STEP_WIDTH,
                    ),
                  }
                })

                setHandles(newHandles)

                updateContinuousMapping(
                  {
                    ...minState,
                    value: newMin,
                  },
                  maxState,
                  newHandles,
                )
              }
            }}
            value={minState.value}
          />
        </Box>
        <Paper sx={{ display: 'flex', position: 'relative' }}>
          <Tooltip title="Click to add new handle" placement="top" followCursor>
            <Box
              sx={{
                display: 'flex',
                position: 'relative',
                '&:hover': { cursor: 'copy' },
              }}
              onClickCapture={(e) => {
                const gradientPositionX =
                  e.clientX - e.currentTarget.getBoundingClientRect().x
                let newHandleId = 0
                while (handleIds.has(newHandleId)) {
                  newHandleId++
                }
                const newHandleValue = pixelToValue(
                  [0, NUM_GRADIENT_STEPS],
                  [minState.value as number, maxState.value as number],
                  gradientPositionX / GRADIENT_STEP_WIDTH,
                )
                const newHandleVpValue =
                  color(mapper(newHandleValue))?.formatHex() ?? '#000000'
                const newHandlePixelPosition = {
                  x: valueToPixel(
                    [minState.value as number, maxState.value as number],
                    [0, NUM_GRADIENT_STEPS],
                    GRADIENT_STEP_WIDTH,
                    newHandleValue,
                  ),
                  y: 0,
                }

                const newHandle = {
                  id: newHandleId,
                  value: newHandleValue,
                  vpValue: newHandleVpValue,
                  pixelPosition: newHandlePixelPosition,
                }
                const newHandles = [...handles, newHandle].sort(
                  (a, b) => (a.value as number) - (b.value as number),
                )
                setHandles(newHandles)
                updateContinuousMapping(min, max, newHandles)
              }}
            >
              {Array(NUM_GRADIENT_STEPS)
                .fill(0)
                .map((_, i) => {
                  const value = pixelToValue(
                    [0, NUM_GRADIENT_STEPS],
                    [minState.value as number, maxState.value as number],
                    i,
                  )
                  const nextColor =
                    color(mapper(value))?.formatHex() ?? '#000000'

                  return (
                    <Box
                      key={i}
                      sx={{
                        width: GRADIENT_STEP_WIDTH,
                        height: 100,
                        backgroundColor: nextColor,
                      }}
                    ></Box>
                  )
                })}
            </Box>
          </Tooltip>
          {handles.map((h) => {
            return (
              <Draggable
                key={h.id}
                bounds="parent"
                axis="x"
                handle=".handle"
                onDrag={(e, data) => {
                  const newRangePosition = pixelToValue(
                    [0, NUM_GRADIENT_STEPS],
                    [minState.value as number, maxState.value as number],
                    data.x / GRADIENT_STEP_WIDTH,
                  )

                  const handleIndex = handles.findIndex(
                    (handle) => handle.id === h.id,
                  )
                  if (handleIndex >= 0) {
                    const newHandles = [...handles]
                    newHandles[handleIndex].value = newRangePosition
                    newHandles.sort(
                      (a, b) => (a.value as number) - (b.value as number),
                    )
                    setHandles(newHandles)
                    updateContinuousMapping(minState, maxState, newHandles)
                  }
                }}
                position={{
                  x: valueToPixel(
                    [minState.value as number, maxState.value as number],
                    [0, NUM_GRADIENT_STEPS],
                    GRADIENT_STEP_WIDTH,
                    h.value as number,
                  ),
                  y: 0,
                }}
              >
                <Box
                  sx={{
                    width: 2,
                    height: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'absolute',
                    zIndex: 1,
                  }}
                >
                  <Paper
                    sx={{
                      p: 1,
                      position: 'relative',
                      top: -100,
                      zIndex: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <IconButton
                      sx={{ position: 'absolute', top: -20, right: -16 }}
                      onClick={() => {
                        const handleIndex = handles.findIndex(
                          (handle) => handle.id === h.id,
                        )
                        if (handleIndex >= 0) {
                          const newHandles = [...handles]
                          newHandles.splice(handleIndex, 1)
                          setHandles(newHandles)
                          updateContinuousMapping(
                            minState,
                            maxState,
                            newHandles,
                          )
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>

                    <VisualPropertyValueForm
                      currentValue={h.vpValue ?? null}
                      visualProperty={props.visualProperty}
                      onValueChange={(newValue) => {
                        const handleIndex = handles.findIndex(
                          (handle) => handle.id === h.id,
                        )
                        if (handleIndex >= 0) {
                          const newHandles = [...handles]
                          newHandles[handleIndex].vpValue = newValue
                          setHandles(newHandles)
                          updateContinuousMapping(
                            minState,
                            maxState,
                            newHandles,
                          )
                        }
                      }}
                    />
                    <TextField
                      sx={{ width: 50, mt: 1 }}
                      inputProps={{
                        sx: { p: 0.5, fontSize: 14, width: 50 },
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        step: 0.1,
                      }}
                      onChange={(e) => {
                        const handleIndex = handles.findIndex(
                          (handle) => handle.id === h.id,
                        )
                        if (handleIndex >= 0) {
                          const newHandles = [...handles]
                          const newVal = Number(e.target.value)

                          if (!isNaN(newVal)) {
                            newHandles[handleIndex].value = newVal
                            newHandles[handleIndex].pixelPosition = {
                              x: valueToPixel(
                                [
                                  minState.value as number,
                                  maxState.value as number,
                                ],
                                [0, NUM_GRADIENT_STEPS],
                                GRADIENT_STEP_WIDTH,
                                newVal,
                              ),
                              y: 0,
                            }
                            newHandles.sort(
                              (a, b) =>
                                (a.value as number) - (b.value as number),
                            )
                            setHandles(newHandles)
                            updateContinuousMapping(
                              minState,
                              maxState,
                              newHandles,
                            )
                          }
                        }
                      }}
                      value={h.value as number}
                    />
                  </Paper>
                  <IconButton
                    className="handle"
                    size="large"
                    sx={{
                      position: 'relative',
                      top: -120,
                      '&:hover': { cursor: 'col-resize' },
                    }}
                  >
                    <ArrowDropDownIcon sx={{ fontSize: '40px' }} />
                  </IconButton>
                </Box>
              </Draggable>
            )
          })}
        </Paper>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 1,
            m: 1,
          }}
        >
          <VisualPropertyValueForm
            currentValue={maxState.vpValue}
            visualProperty={props.visualProperty}
            onValueChange={(newValue) => {
              setMaxState({
                ...maxState,
                vpValue: newValue,
              })
              updateContinuousMapping(minState, maxState, handles)
            }}
          />
          <Typography variant="body2">Max</Typography>
          <TextField
            sx={{ width: 50 }}
            inputProps={{
              sx: { p: 0.5, fontSize: 14, width: 50 },
              inputMode: 'numeric',
              pattern: '[0-9]*',
              step: 0.1,
            }}
            onChange={(e) => {
              const newMax = Number(e.target.value)
              if (!isNaN(newMax)) {
                setMaxState({
                  ...maxState,
                  value: newMax,
                })

                const newHandles = handles.map((h) => {
                  return {
                    ...h,
                    value: pixelToValue(
                      [0, NUM_GRADIENT_STEPS],
                      [minState.value as number, newMax],
                      h.pixelPosition.x / GRADIENT_STEP_WIDTH,
                    ),
                  }
                })

                setHandles(newHandles)
                updateContinuousMapping(minState, maxState, handles)
              }
            }}
            value={maxState.value}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Typography variant="body1">{m.attribute}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button color="error" onClick={() => console.log('TODO')}>
          Cancel
        </Button>
        <Button>Confirm</Button>
      </Box>
    </Box>
  )
}
