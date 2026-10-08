import AddIcon from '@mui/icons-material/Add'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft'
import ArrowRightIcon from '@mui/icons-material/ArrowRight'
import ClearIcon from '@mui/icons-material/Clear'
import { Box, Button, IconButton, Paper, Popover, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { AxisBottom } from '@visx/axis'
import { scaleLinear } from '@visx/scale'
import { extent } from 'd3-array'
import debounce from 'lodash/debounce'
import * as React from 'react'
import Draggable from 'react-draggable'

import { useVisualStyleStore } from '../../../../../data/hooks/stores/VisualStyleStore'
import { useUndoStack } from '../../../../../data/hooks/useUndoStack'
import { IdType } from '../../../../../models/IdType'
import { UndoCommandType } from '../../../../../models/StoreModel/UndoStoreModel'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../../models/VisualStyleModel'
import { ContinuousMappingFunction } from '../../../../../models/VisualStyleModel/VisualMappingFunction'
import { ContinuousFunctionControlPoint } from '../../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import { VisualPropertyValueForm } from '../../VisualPropertyValueForm'
import { ExpandableNumberInput } from './ExpandableNumberInput'
import { addHandle, editHandle, Handle, removeHandle } from './handleUtil'

export function ContinuousDiscreteMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const theme = useTheme()
  const m = props.visualProperty?.mapping as ContinuousMappingFunction | null

  const { min, max, controlPoints } = m ?? {
    min: { value: 0, vpValue: props.visualProperty.defaultValue },
    max: { value: 0, vpValue: props.visualProperty.defaultValue },
    controlPoints: [] as ContinuousFunctionControlPoint[],
  }

  const [minState, setMinState] = React.useState(min)
  const [maxState, setMaxState] = React.useState(max)

  const [handles, setHandles] = React.useState<Handle[]>(() => {
    const pts = [
      { value: min.value as number, vpValue: min.vpValue },
      ...controlPoints
        .filter((cp) => cp.value !== min.value && cp.value !== max.value)
        .map((cp) => ({ value: cp.value as number, vpValue: cp.vpValue })),
      { value: max.value as number, vpValue: max.vpValue },
    ].sort((a, b) => a.value - b.value)

    return pts.map((pt, index) => ({
      ...pt,
      inclusive: false,
      id: index,
    }))
  })

  const [ltMin, setLtMin] = React.useState<VisualPropertyValueType>(
    (m?.ltMinVpValue ?? m?.min.vpValue) as VisualPropertyValueType,
  )
  const [gtMax, setGtMax] = React.useState<VisualPropertyValueType>(
    (m?.gtMaxVpValue ?? m?.max.vpValue) as VisualPropertyValueType,
  )

  const [addHandleFormValue, setAddHandleFormValue] = React.useState(0)
  const [addHandleFormVpValue, setAddHandleFormVpValue] = React.useState(
    props.visualProperty.defaultValue,
  )
  const [lastDraggedHandleId, setlastDraggedHandleId] = React.useState<
    number | null
  >(null)

  const [createHandleAnchorEl, setCreateHandleAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)

  const showCreateHandleMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setCreateHandleAnchorEl(event.currentTarget)
  }

  const hideCreateHandleMenu = (): void => {
    setCreateHandleAnchorEl(null)
  }

  const NUM_GRADIENT_STEPS = 140
  const GRADIENT_STEP_WIDTH = 4
  const GRADIENT_HEIGHT = 100
  const GRADIENT_AXIS_HORIZONTAL_PADDING = 30
  const GRADIENT_AXIS_VERTICAL_PADDING = 100
  const GRADIENT_AXIS_OFFSET_LEFT = 10

  const setContinuousMappingValues = useVisualStyleStore(
    (state) => state.setContinuousMappingValues,
  )
  const { postEdit } = useUndoStack()

  const valueDomain = [
    minState.value as number,
    ...handles.map((h) => h.value as number),
    maxState.value as number,
  ]

  const valuePixelScale = scaleLinear({
    range: [0, NUM_GRADIENT_STEPS * GRADIENT_STEP_WIDTH],
    domain: extent(valueDomain) as [number, number],
  })

  const latest = React.useRef({ m, props, postEdit })
  latest.current = { m, props, postEdit }

  const updateContinuousMapping = React.useMemo(
    () =>
      debounce(
        (
          min: ContinuousFunctionControlPoint,
          max: ContinuousFunctionControlPoint,
          handles: Handle[],
          ltMinVpValue: VisualPropertyValueType,
          gtMaxVpValue: VisualPropertyValueType,
        ) => {
          const { m, props, postEdit } = latest.current
          if (m == null) return
          const nextMapping: ContinuousMappingFunction = {
            ...m,
            min,
            max,
            controlPoints: handles.map((h) => {
              return {
                value: h.value,
                vpValue: h.vpValue,
                inclusive: false,
              }
            }),
            ltMinVpValue,
            gtMaxVpValue,
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
            nextMapping.controlPoints,
            ltMinVpValue,
            gtMaxVpValue,
          )
        },
        200,
        { trailing: true },
      ),
    [setContinuousMappingValues],
  )

  React.useEffect(() => {
    if (props.visualProperty.mapping == null) return
    const nextMapping = props.visualProperty
      .mapping as ContinuousMappingFunction
    const nextMin = nextMapping.min ?? minState
    const nextMax = nextMapping.max ?? maxState
    const nextControlPoints =
      nextMapping.controlPoints ?? ([] as ContinuousFunctionControlPoint[])

    setMinState(nextMin)
    setMaxState(nextMax)

    const pts = [
      { value: nextMin.value as number, vpValue: nextMin.vpValue },
      ...nextControlPoints
        .filter(
          (cp) => cp.value !== nextMin.value && cp.value !== nextMax.value,
        )
        .map((cp) => ({ value: cp.value as number, vpValue: cp.vpValue })),
      { value: nextMax.value as number, vpValue: nextMax.vpValue },
    ].sort((a, b) => a.value - b.value)

    setHandles(
      pts.map((pt, index) => ({
        ...pt,
        inclusive: false,
        id: index,
      })),
    )

    setLtMin(
      (nextMapping.ltMinVpValue ??
        nextMapping.min.vpValue) as VisualPropertyValueType,
    )
    setGtMax(
      (nextMapping.gtMaxVpValue ??
        nextMapping.max.vpValue) as VisualPropertyValueType,
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.visualProperty.mapping?.attribute])

  const createHandle = (
    value: number,
    vpValue: VisualPropertyValueType,
  ): void => {
    const newHandles = addHandle(handles, value, vpValue)
    setHandles(newHandles)
    updateContinuousMapping(minState, maxState, newHandles, ltMin, gtMax)
  }

  const deleteHandle = (id: number): void => {
    const newHandles = removeHandle(handles, id)
    setHandles(newHandles)
    updateContinuousMapping(minState, maxState, newHandles, ltMin, gtMax)
  }

  const setHandle = (
    id: number,
    value: number,
    vpValue: VisualPropertyValueType,
  ): void => {
    const newHandles = editHandle(handles, id, value, vpValue)
    setHandles(newHandles)
    updateContinuousMapping(minState, maxState, newHandles, ltMin, gtMax)
  }

  React.useEffect(() => {
    const [min, max] = extent(handles.map((h) => h.value as number))
    const minValue: number = minState.value as number
    if (min != null && min < minValue) {
      setMinState({ ...minState, value: min })
    }

    const maxValue: number = maxState.value as number
    if (max != null && max > maxValue) {
      setMaxState({ ...maxState, value: max })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handles])

  React.useEffect(() => {
    const newHandles = [...handles]
      .map((h) => {
        return {
          ...h,
          value: Math.max(h.value as number, minState.value as number),
        }
      })
      .sort((a, b) => (a.value as number) - (b.value as number))

    newHandles[0].value = minState.value as number
    newHandles[0].vpValue = minState.vpValue
    setHandles(newHandles)
    updateContinuousMapping(minState, maxState, newHandles, ltMin, gtMax)
    setAddHandleFormValue(
      ((minState.value as number) + (maxState.value as number)) / 2,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minState])

  React.useEffect(() => {
    const newHandles = [...handles]
      .map((h) => {
        return {
          ...h,
          value: Math.min(h.value as number, maxState.value as number),
        }
      })
      .sort((a, b) => (a.value as number) - (b.value as number))

    newHandles[newHandles.length - 1].value = maxState.value as number
    newHandles[newHandles.length - 1].vpValue = maxState.vpValue
    setHandles(newHandles)
    updateContinuousMapping(minState, maxState, newHandles, ltMin, gtMax)
    setAddHandleFormValue(
      ((minState.value as number) + (maxState.value as number)) / 2,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxState])

  if (m == null) {
    return <Box></Box>
  }

  return (
    <Paper variant="filled" sx={{ px: 8, py: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mt: 12,
          mb: 1,
          justifyContent: 'center',
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          <Box sx={{ p: 1.5 }}>
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
                  const trackElement = e.currentTarget
                  const rect = trackElement.getBoundingClientRect()
                  const positionX = e.clientX - rect.x
                  const newHandleValue = Math.max(
                    minState.value as number,
                    Math.min(
                      valuePixelScale.invert(positionX),
                      maxState.value as number,
                    ),
                  )
                  createHandle(
                    newHandleValue,
                    props.visualProperty.defaultValue,
                  )
                }}
              >
                <Box sx={{ display: 'flex' }}>
                  <Box
                    sx={{
                      width: NUM_GRADIENT_STEPS * GRADIENT_STEP_WIDTH,
                      height: GRADIENT_HEIGHT,
                      backgroundColor: theme.palette.action.hover,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -GRADIENT_AXIS_OFFSET_LEFT,
                    }}
                  >
                    <svg
                      width={
                        GRADIENT_AXIS_HORIZONTAL_PADDING +
                        NUM_GRADIENT_STEPS * GRADIENT_STEP_WIDTH
                      }
                      height={GRADIENT_AXIS_VERTICAL_PADDING + GRADIENT_HEIGHT}
                    >
                      <AxisBottom
                        scale={valuePixelScale}
                        left={GRADIENT_AXIS_OFFSET_LEFT}
                        top={GRADIENT_HEIGHT}
                        labelProps={{
                          fontSize: 14,
                          textAnchor: 'middle',
                          fill: theme.palette.text.secondary,
                        }}
                        label={m.attribute}
                        stroke={theme.palette.text.secondary}
                        tickStroke={theme.palette.text.secondary}
                        tickLabelProps={() => ({
                          fill: theme.palette.text.secondary,
                          fontSize: 10,
                          textAnchor: 'middle',
                          verticalAnchor: 'end',
                          dy: 2,
                        })}
                      />
                    </svg>
                  </Box>
                </Box>
              </Paper>
            </Tooltip>
            {handles.map((h, index) => {
              const isEndHandle = index === 0 || index === handles.length - 1
              const isMinHandle = index === 0
              const isMaxHandle = index === handles.length - 1

              return (
                <Draggable
                  key={h.id}
                  disabled={isEndHandle}
                  bounds="parent"
                  axis="x"
                  handle=".handle"
                  onStart={() => setlastDraggedHandleId(h.id)}
                  onStop={() => setlastDraggedHandleId(h.id)}
                  onDrag={(e, data) => {
                    const newValue = valuePixelScale.invert(data.x)
                    setHandle(h.id, newValue, h.vpValue)
                  }}
                  position={{
                    x: valuePixelScale(h.value as number),
                    y: 0,
                  }}
                >
                  <Box
                    onClick={() => setlastDraggedHandleId(h.id)}
                    sx={{
                      width: 2,
                      height: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'absolute',
                      zIndex:
                        lastDraggedHandleId === h.id ? 3 : isEndHandle ? 1 : 2,
                    }}
                  >
                    <Paper
                      variant={isEndHandle ? 'outlined' : 'elevation'}
                      elevation={isEndHandle ? 0 : 4}
                      sx={{
                        p: 0.5,
                        position: 'relative',
                        top: -195,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex:
                          lastDraggedHandleId === h.id
                            ? 3
                            : isEndHandle
                              ? 1
                              : 2,
                      }}
                    >
                      {handles.length >= 3 && !isEndHandle ? (
                        <IconButton
                          size="small"
                          onClick={() => deleteHandle(h.id)}
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            width: 20,
                            height: 20,
                            backgroundColor: (theme) =>
                              theme.palette.text.secondary,
                            color: (theme) => theme.palette.background.default,
                            '&:hover': {
                              cursor: 'pointer',
                              backgroundColor: (theme) =>
                                theme.palette.text.primary,
                              color: (theme) => theme.palette.background.paper,
                            },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      ) : !isEndHandle ? (
                        <ClearIcon
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            width: 20,
                            height: 20,
                            fontSize: 16,
                            color: (theme) => theme.palette.text.disabled,
                            pointerEvents: 'none',
                          }}
                        />
                      ) : null}

                      <Box sx={{ pl: 1.8, pr: 1.8, mb: 1 }}>
                        <VisualPropertyValueForm
                          currentValue={h.vpValue ?? null}
                          visualProperty={props.visualProperty}
                          currentNetworkId={props.currentNetworkId}
                          onValueChange={(newValue) => {
                            const val = newValue as VisualPropertyValueType
                            if (isMinHandle) {
                              setMinState({ ...minState, vpValue: val })
                            } else if (isMaxHandle) {
                              setMaxState({ ...maxState, vpValue: val })
                            }
                            setHandle(h.id, h.value as number, val)
                          }}
                        />
                      </Box>
                      <Box sx={{ mb: 1 }}>
                        <ExpandableNumberInput
                          value={h.value as number}
                          onConfirm={(newValue) => {
                            if (isMinHandle) {
                              setMinState({ ...minState, value: newValue })
                            } else if (isMaxHandle) {
                              setMaxState({ ...maxState, value: newValue })
                            } else {
                              setHandle(h.id, newValue, h.vpValue)
                            }
                          }}
                          min={
                            isMinHandle ? undefined : (minState.value as number)
                          }
                          max={
                            isMaxHandle ? undefined : (maxState.value as number)
                          }
                        />
                      </Box>
                    </Paper>

                    <IconButton
                      disabled={isEndHandle}
                      className="handle"
                      size="large"
                      sx={{
                        position: 'relative',
                        top: -220,
                        '&:hover': { cursor: 'col-resize' },
                      }}
                    >
                      <ArrowDropDownIcon
                        sx={{
                          fontSize: '40px',
                          color: (theme) =>
                            isEndHandle
                              ? theme.palette.text.disabled
                              : theme.palette.text.secondary,
                          zIndex: 3,
                        }}
                      />
                    </IconButton>
                  </Box>
                </Draggable>
              )
            })}
            <Tooltip
              title={`${m.attribute} values less than the min (${minState.value}) will be mapped to this value.`}
            >
              <Paper
                variant="outlined"
                sx={{
                  width: 50,
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  top: -70,
                  left: -70,
                }}
              >
                <ArrowLeftIcon
                  sx={{
                    fontSize: 40,
                    position: 'absolute',
                    left: -27,
                    color: (theme) => theme.palette.text.disabled,
                  }}
                />
                <VisualPropertyValueForm
                  currentValue={ltMin}
                  visualProperty={props.visualProperty}
                  currentNetworkId={props.currentNetworkId}
                  onValueChange={(newValue) => {
                    const val = newValue as VisualPropertyValueType
                    setLtMin(val)
                    updateContinuousMapping(
                      minState,
                      maxState,
                      handles,
                      val,
                      gtMax,
                    )
                  }}
                />
              </Paper>
            </Tooltip>
            <Tooltip
              title={`${m.attribute} values greater than the max (${maxState.value}) will be mapped to this value.`}
            >
              <Paper
                variant="outlined"
                sx={{
                  width: 50,
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  top: -120,
                  left: 580,
                }}
              >
                <ArrowRightIcon
                  sx={{
                    fontSize: 40,
                    position: 'absolute',
                    left: 35,
                    color: (theme) => theme.palette.text.disabled,
                  }}
                />
                <VisualPropertyValueForm
                  currentValue={gtMax}
                  visualProperty={props.visualProperty}
                  currentNetworkId={props.currentNetworkId}
                  onValueChange={(newValue) => {
                    const val = newValue as VisualPropertyValueType
                    setGtMax(val)
                    updateContinuousMapping(
                      minState,
                      maxState,
                      handles,
                      ltMin,
                      val,
                    )
                  }}
                />
              </Paper>
            </Tooltip>
          </Box>
        </Paper>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          p: 1,
          justifyContent: 'space-evenly',
        }}
      >
        <Button
          onClick={showCreateHandleMenu}
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
        >
          New Handle
        </Button>
        <Popover
          open={createHandleAnchorEl != null}
          anchorEl={createHandleAnchorEl}
          onClose={hideCreateHandleMenu}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Box
            sx={{ p: 1, display: 'flex', flexDirection: 'column', width: 200 }}
          >
            <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                  }}
                >
                  {m.attribute}:
                </Box>
                <ExpandableNumberInput
                  value={addHandleFormValue}
                  onConfirm={(newValue) => setAddHandleFormValue(newValue)}
                  min={minState.value as number}
                  max={maxState.value as number}
                />
              </Box>
              <Box
                sx={{
                  mt: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                  }}
                >
                  {props.visualProperty.displayName}:
                </Box>
                <VisualPropertyValueForm
                  currentValue={addHandleFormVpValue}
                  visualProperty={props.visualProperty}
                  currentNetworkId={props.currentNetworkId}
                  onValueChange={(newValue) =>
                    setAddHandleFormVpValue(newValue as VisualPropertyValueType)
                  }
                />
              </Box>
            </Box>
            <Button
              sx={{ alignSelf: 'flex-end', mt: 1 }}
              size="small"
              onClick={() => {
                createHandle(addHandleFormValue, addHandleFormVpValue)
                hideCreateHandleMenu()
              }}
            >
              Add Handle
            </Button>
          </Box>
        </Popover>
      </Paper>
    </Paper>
  )
}
