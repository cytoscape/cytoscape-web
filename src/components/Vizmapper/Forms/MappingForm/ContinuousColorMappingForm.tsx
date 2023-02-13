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
import { scaleLinear as visXScaleLinear } from '@visx/scale'
import { AxisBottom } from '@visx/axis'
import { extent } from 'd3-array'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import Delete from '@mui/icons-material/DisabledByDefault'

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

  const [addHandleFormValue, setAddHandleFormValue] = React.useState(0)
  const [addHandleFormVpValue, setAddHandleFormVpValue] = React.useState(
    props.visualProperty.defaultValue,
  )

  const NUM_GRADIENT_STEPS = 144
  const GRADIENT_STEP_WIDTH = 4
  const GRADIENT_HEIGHT = 100

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

  const valueDomain = [
    minState.value as number,
    ...handles.map((h) => h.value as number),
    maxState.value as number,
  ]
  const xScale = visXScaleLinear({
    range: [0, NUM_GRADIENT_STEPS * GRADIENT_STEP_WIDTH],
    domain: extent(valueDomain) as [number, number],
  })

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
    <Paper sx={{ backgroundColor: '#D9D9D9', pb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          pt: 13.5,
          mb: 3,
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            userSelect: 'none',
            pb: 6,
          }}
          elevation={4}
        >
          <Box sx={{ p: 1 }}>
            <Tooltip
              title="Click to add new handle"
              placement="top"
              followCursor
            >
              <Paper
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
                          height: GRADIENT_HEIGHT,
                          backgroundColor: nextColor,
                        }}
                      ></Box>
                    )
                  })}
                <Box sx={{ position: 'absolute' }}>
                  <svg
                    width={30 + NUM_GRADIENT_STEPS * GRADIENT_STEP_WIDTH}
                    height={100 + GRADIENT_HEIGHT}
                  >
                    <AxisBottom
                      scale={xScale}
                      top={GRADIENT_HEIGHT}
                      labelProps={{
                        fontSize: 14,
                        textAnchor: 'middle',
                      }}
                      label={m.attribute}
                      stroke={'#1b1a1e'}
                    />
                  </svg>
                </Box>
              </Paper>
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
                      elevation={4}
                      sx={{
                        p: 0.5,
                        position: 'relative',
                        top: -195,
                        zIndex: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        border: '0.5px solid #03082d',
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
                        <Delete sx={{ color: '#03082d' }} />
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
                        top: -220,
                        '&:hover': { cursor: 'col-resize' },
                      }}
                    >
                      <ArrowDropDownIcon
                        sx={{ fontSize: '40px', color: '#03082d', zIndex: 3 }}
                      />
                    </IconButton>
                  </Box>
                </Draggable>
              )
            })}
          </Box>
        </Paper>
      </Box>

      <Box
        sx={{ display: 'flex', p: 1, mt: 1, justifyContent: 'space-evenly' }}
      >
        <Paper
          sx={{
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            width: 180,
            backgroundColor: '#fcfffc',
            color: '#595858',
          }}
        >
          <Typography variant="body2">Add handle</Typography>
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pt: 1,
                pb: 1,
              }}
            >
              <Typography variant="body2">{m.attribute}:</Typography>
              <TextField
                sx={{ width: 40, ml: 0.5, mr: 0.5 }}
                inputProps={{
                  sx: {
                    p: 0.5,
                    fontSize: 12,
                    width: 50,
                  },
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  step: 0.1,
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value)
                  if (!isNaN(newValue)) {
                    setAddHandleFormValue(newValue)
                  }
                }}
                value={addHandleFormValue}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pt: 1,
                pb: 1,
              }}
            >
              <Typography variant="body2">
                {props.visualProperty.displayName}:
              </Typography>
              <VisualPropertyValueForm
                currentValue={addHandleFormVpValue}
                visualProperty={props.visualProperty}
                onValueChange={(newValue) => {
                  setAddHandleFormVpValue(newValue)
                }}
              />
            </Box>
          </Box>
          <Button
            variant="text"
            onClick={() => {
              let newHandleId = 0
              const handleIds = new Set(handles.map((h) => h.id))
              while (handleIds.has(newHandleId)) {
                newHandleId++
              }

              const newHandle = {
                id: newHandleId,
                value: addHandleFormValue,
                vpValue: addHandleFormVpValue,
                pixelPosition: {
                  x: 0,
                  y: 0,
                },
              }

              if (newHandle.value < minState.value) {
                setMinState({
                  ...minState,
                  value: newHandle.value,
                })
              } else {
                if (newHandle.value > maxState.value) {
                  setMaxState({
                    ...maxState,
                    value: newHandle.value,
                  })
                }
              }

              const newHandles = [...handles, newHandle].sort(
                (a, b) => (a.value as number) - (b.value as number),
              )
              setHandles(newHandles)
              updateContinuousMapping(min, max, newHandles)
            }}
            size="small"
          >
            Add Handle
          </Button>
        </Paper>

        <Paper sx={{ p: 1, backgroundColor: '#fcfffc', color: '#595858' }}>
          <Typography variant="body2">Settings</Typography>

          <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2">Domain: </Typography>
            <Box sx={{ p: 1, display: 'flex' }}>
              <Typography variant="body1">[</Typography>
              <TextField
                sx={{ width: 40, ml: 0.5, mr: 0.5 }}
                inputProps={{
                  sx: {
                    p: 0.5,
                    fontSize: 12,
                    width: 50,
                  },
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  step: 0.1,
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value)
                  if (!isNaN(newValue)) {
                    setMinState({
                      ...minState,
                      value: newValue,
                    })

                    const newHandles = [...handles].map((h) => {
                      return {
                        ...h,
                        value: Math.max(h.value as number, newValue),
                      }
                    })
                    setHandles(newHandles)

                    updateContinuousMapping(minState, maxState, handles)
                  }
                }}
                value={minState.value}
              />
              <Typography variant="body1">, </Typography>
              <TextField
                value={maxState.value}
                sx={{ width: 40, ml: 0.5, mr: 0.5 }}
                inputProps={{
                  sx: {
                    p: 0.5,
                    fontSize: 12,
                    width: 50,
                  },
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  step: 0.1,
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value)
                  if (!isNaN(newValue)) {
                    setMaxState({
                      ...maxState,
                      value: newValue,
                    })

                    const newHandles = [...handles].map((h) => {
                      return {
                        ...h,
                        value: Math.min(h.value as number, newValue),
                      }
                    })
                    setHandles(newHandles)

                    // const newHandles = handles.map((h) => {
                    //   const pixelPosX =
                    //     xMapper([h.value as number, h.vpValue as number]) +
                    //     LINE_CHART_MARGIN_LEFT

                    //   const newDomain = [
                    //     minState.value as number,
                    //     ...handles.map((h) => h.value as number),
                    //     newMax,
                    //   ]
                    //   const newXScale = visXScaleLinear({
                    //     range: [0, xMax],
                    //     domain: extent(newDomain) as [number, number],
                    //   })

                    //   const newValue = newXScale.invert(
                    //     pixelPosX - LINE_CHART_MARGIN_LEFT,
                    //   )
                    //   console.log(newValue)

                    //   return {
                    //     ...h,
                    //     value: newValue,
                    //   }
                    // })

                    // setHandles(newHandles)

                    updateContinuousMapping(minState, maxState, handles)
                  }
                }}
              />
              <Typography variant="body1">]</Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              p: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2">
              {`${props.visualProperty.displayName} for values < domain min(${
                minState.value as number
              }): `}
            </Typography>
            <VisualPropertyValueForm
              currentValue={minState.vpValue}
              visualProperty={props.visualProperty}
              onValueChange={(newValue) => {
                setMaxState({
                  ...minState,
                  vpValue: newValue,
                })
                updateContinuousMapping(minState, maxState, handles)
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              p: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2">
              {`${props.visualProperty.displayName} for values > domain max(${
                maxState.value as number
              }): `}
            </Typography>

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
          </Box>
        </Paper>
      </Box>
    </Paper>
  )
}
