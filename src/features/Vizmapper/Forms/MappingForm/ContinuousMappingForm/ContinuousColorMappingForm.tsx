import AddIcon from '@mui/icons-material/Add'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft'
import ArrowRightIcon from '@mui/icons-material/ArrowRight'
import ClearIcon from '@mui/icons-material/Clear'
import EditIcon from '@mui/icons-material/Edit'
import {
  Box,
  Button,
  IconButton,
  Paper,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { scaleLinear } from '@visx/scale'
import { extent } from 'd3-array'
import { color } from 'd3-color'
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
import { ColorGradient } from './ColorGradient'
import { ColorPalettePicker } from './ColorPalettePicker'
import { ExpandableNumberInput } from './ExpandableNumberInput'
import { addHandle, editHandle, Handle, removeHandle } from './handleUtil'

// color mapping form for now
export function ContinuousColorMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const theme = useTheme()
  const m: ContinuousMappingFunction | null = props.visualProperty
    ?.mapping as ContinuousMappingFunction

  // Fall back to a harmless empty mapping so the hooks below can run
  // unconditionally; the component still bails out before rendering when
  // the real mapping is missing (see the early return above the JSX below).
  const { min, max, controlPoints } = m ?? {
    min: { value: 0, vpValue: '' },
    max: { value: 0, vpValue: '' },
    controlPoints: [] as ContinuousFunctionControlPoint[],
  }

  const [minState, setMinState] = React.useState(min)
  const [maxState, setMaxState] = React.useState(max)
  const [handles, setHandles] = React.useState(() => {
    return [...controlPoints]
      .sort((a, b) => (a.value as number) - (b.value as number))
      .map((pt, index) => {
        const handle = {
          ...pt,
          id: index,
        }
        if (index === 0) {
          handle.value = min.value
        }
        if (index === controlPoints.length - 1) {
          handle.value = max.value
        }
        return handle
      })
  })

  const [addHandleFormValue, setAddHandleFormValue] = React.useState(0)
  const [addHandleFormVpValue, setAddHandleFormVpValue] = React.useState(
    props.visualProperty.defaultValue,
  )
  const [lastDraggedHandleId, setlastDraggedHandleId] = React.useState<
    number | null
  >(null)

  const [editMinMaxAnchorEl, setEditMinMaxAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)
  const [createHandleAnchorEl, setCreateHandleAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)
  const showMinMaxMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setEditMinMaxAnchorEl(event.currentTarget)
  }

  const hideMinMaxMenu = (): void => {
    setEditMinMaxAnchorEl(null)
  }

  const showCreateHandleMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setCreateHandleAnchorEl(event.currentTarget)
  }

  const hideCreateHandleMenu = (): void => {
    setCreateHandleAnchorEl(null)
  }

  const [textPalette, setTextPalette] = React.useState('None')
  const [buttonText, setButtonText] = React.useState(textPalette)

  const handlePaletteSelect = (
    minColor: string,
    middleColor: string,
    maxColor: string,
    paletteName: string,
  ): void => {
    const nextMinState = {
      ...minState,
      vpValue: minColor,
    }

    const nextMaxState = {
      ...maxState,
      vpValue: maxColor,
    }

    const newHandles = [...handles]
    newHandles[0].vpValue = minColor
    newHandles[handles.length - 1].vpValue = maxColor

    if (newHandles.length >= 3) {
      newHandles[1].vpValue = middleColor
    }

    updateContinuousMapping(
      nextMinState,
      nextMaxState,
      newHandles,
      minColor,
      maxColor,
    )
    setTextPalette(paletteName)
    setButtonText(paletteName)
  }

  const NUM_GRADIENT_STEPS = 140
  const GRADIENT_STEP_WIDTH = 4
  const GRADIENT_HEIGHT = 100
  const GRADIENT_AXIS_HORIZONTAL_PADDING = 30 // needed to make sure the axis labels are not cut off
  const GRADIENT_AXIS_VERTICAL_PADDING = 100 // needed to display the axis at the bottom of the color gradient
  const GRADIENT_AXIS_OFFSET_LEFT = 10 // needed to make sure the axis labels are not cut off
  const setContinuousMappingValues = useVisualStyleStore(
    (state) => state.setContinuousMappingValues,
  )
  const { postEdit } = useUndoStack()

  const valueDomain = [
    minState.value as number,
    ...handles.map((h) => h.value as number),
    maxState.value as number,
  ]

  const vpValueDomain = [
    minState.vpValue as string,
    ...handles.map((h) => h.vpValue as string),
    maxState.vpValue as string,
  ]

  // map values to pixels
  const valuePixelScale = scaleLinear({
    range: [0, NUM_GRADIENT_STEPS * GRADIENT_STEP_WIDTH],
    domain: extent(valueDomain) as [number, number],
  })

  // map values to colors
  const colorScale = scaleLinear({
    domain: valueDomain,
    range: vpValueDomain,
  })

  // The debounced commit below must keep a stable identity (recreating it
  // would drop pending trailing calls), so it reads the current mapping and
  // props through this ref instead of its creation-time closure — otherwise
  // every commit spreads the mount-time mapping and records the mount-time
  // value as the undo "before" state, corrupting the undo stack.
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
          const nextMapping: ContinuousMappingFunction = {
            ...m,
            min,
            max,
            controlPoints: handles.map((h) => {
              return {
                value: h.value,
                vpValue: h.vpValue,
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
          }
        }),
    )
    // Key-driven resync: rebuild local min/max/handles from the store only
    // when the mapped attribute changes. minState/maxState are `??` fallbacks
    // read fresh at trigger time; adding them would reset the user's
    // in-progress input from the (200ms-lagging, debounced) store value.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync keyed on mapping attribute only
  }, [props.visualProperty.mapping?.attribute])

  const createHandle = (value: number, vpValue: string): void => {
    const newHandles = addHandle(handles, value, vpValue)
    setHandles(newHandles)
    updateContinuousMapping(
      min,
      max,
      newHandles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
  }

  const deleteHandle = (id: number): void => {
    const newHandles = removeHandle(handles, id)
    setHandles(newHandles)
    updateContinuousMapping(
      minState,
      maxState,
      newHandles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
  }

  const setHandle = (id: number, value: number, vpValue: string): void => {
    const newHandles = editHandle(handles, id, value, vpValue)
    setHandles(newHandles)
    updateContinuousMapping(
      minState,
      maxState,
      newHandles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
  }

  // when someone changes a handle, the new handle values may contain a new min/max value
  // update the min and max accordingly
  React.useEffect(() => {
    const [min, max] = extent(handles.map((h) => h.value as number))
    const minValue: number = minState.value as number
    if (min != null && min < minValue) {
      setMinState({
        ...minState,
        value: min,
      })
    }

    const maxValue: number = maxState.value as number
    if (max != null && max > maxValue) {
      setMaxState({
        ...maxState,
        value: max,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on handle edits; the [minState]/[maxState] effects own the inverse clamping
  }, [handles])

  // anytime someone changes the min value, make sure all handle values are greater than the min
  // note: `handles` must stay out of the deps — setHandles creates new identities
  // every run, so adding it would re-trigger this effect forever
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
    setHandles(newHandles)

    updateContinuousMapping(
      minState,
      maxState,
      handles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
    setAddHandleFormValue(
      ((minState.value as number) + (maxState.value as number)) / 2,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- min-edit trigger only; adding handles would loop
  }, [minState])

  // anytime someone changes the max value, make sure all handle values are less than the max
  // note: `handles` must stay out of the deps — setHandles creates new identities
  // every run, so adding it would re-trigger this effect forever
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
    setHandles(newHandles)

    updateContinuousMapping(
      minState,
      maxState,
      handles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
    setAddHandleFormValue(
      ((minState.value as number) + (maxState.value as number)) / 2,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- max-edit trigger only; adding handles would loop
  }, [maxState])

  if (m == null) {
    return <Box></Box>
  }

  return (
    <Paper
      variant="filled"
      sx={{
        px: 8,
        py: 1,
      }}
    >
      <ColorPalettePicker
        currentPaletteName={buttonText}
        onPaletteSelect={handlePaletteSelect}
      />
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
                  const gradientPositionX =
                    e.clientX - e.currentTarget.getBoundingClientRect().x

                  const newHandleValue = Math.max(
                    minState.value as number,
                    Math.min(
                      valuePixelScale.invert(gradientPositionX),
                      maxState.value as number,
                    ),
                  )
                  const newHandleVpValue =
                    color(colorScale(newHandleValue))?.formatHex() ?? '#000000'

                  createHandle(newHandleValue, newHandleVpValue)
                }}
              >
                <ColorGradient
                  numSteps={NUM_GRADIENT_STEPS}
                  stepWidth={GRADIENT_STEP_WIDTH}
                  height={GRADIENT_HEIGHT}
                  domainLabel={m.attribute}
                  axisOffsetLeft={GRADIENT_AXIS_OFFSET_LEFT}
                  horizontalPadding={GRADIENT_AXIS_HORIZONTAL_PADDING}
                  verticalPadding={GRADIENT_AXIS_VERTICAL_PADDING}
                  valuePixelScale={valuePixelScale}
                  colorScale={colorScale}
                  labelColor={theme.palette.text.secondary}
                  strokeColor={theme.palette.text.secondary}
                  cm={m}
                />
              </Paper>
            </Tooltip>
            {handles.map((h, index) => {
              // the first and last handles are special, they can't be dragged and their domain values are immutable
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
                  onStart={() => {
                    setlastDraggedHandleId(h.id)
                  }}
                  onStop={() => {
                    setlastDraggedHandleId(h.id)
                  }}
                  onDrag={(e, data) => {
                    const newValue = valuePixelScale.invert(data.x)
                    setHandle(h.id, newValue, h.vpValue as string)
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
                          onClick={() => {
                            deleteHandle(h.id)
                          }}
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
                            setHandle(
                              h.id,
                              h.value as number,
                              newValue as string,
                            )
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
                              setHandle(h.id, newValue, h.vpValue as string)
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
              title={`${m.attribute} values less than the min (${minState.value}) will be mapped to this color.`}
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
                  currentValue={m.ltMinVpValue}
                  visualProperty={props.visualProperty}
                  currentNetworkId={props.currentNetworkId}
                  onValueChange={(newValue) => {
                    updateContinuousMapping(
                      min,
                      max,
                      handles,
                      newValue,
                      m.gtMaxVpValue,
                    )
                  }}
                />
              </Paper>
            </Tooltip>
            <Tooltip
              title={`${m.attribute} values greater than the max (${maxState.value}) will be mapped to this color.`}
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
                  currentValue={m.gtMaxVpValue}
                  visualProperty={props.visualProperty}
                  currentNetworkId={props.currentNetworkId}
                  onValueChange={(newValue) => {
                    updateContinuousMapping(
                      min,
                      max,
                      handles,
                      m.ltMinVpValue,
                      newValue,
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
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Box
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              width: 200,
            }}
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
                  onValueChange={(newValue) => {
                    setAddHandleFormVpValue(newValue as string)
                  }}
                />
              </Box>
            </Box>
            {!(
              addHandleFormValue < (maxState.value as number) &&
              addHandleFormValue > (minState.value as number)
            ) ? (
              <Typography color="error" variant="caption">
                {`Handle value must be between ${minState.value as number} and ${
                  maxState.value as number
                }`}
              </Typography>
            ) : null}
            <Button
              variant="outlined"
              disabled={
                !(
                  addHandleFormValue < (maxState.value as number) &&
                  addHandleFormValue > (minState.value as number)
                )
              }
              onClick={() => {
                createHandle(addHandleFormValue, addHandleFormVpValue as string)
                hideCreateHandleMenu()
              }}
              size="small"
            >
              Add Handle
            </Button>
          </Box>
        </Popover>
        <Button
          onClick={showMinMaxMenu}
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
        >
          Set Min and Max
        </Button>
        <Popover
          open={editMinMaxAnchorEl != null}
          onClose={hideMinMaxMenu}
          anchorEl={editMinMaxAnchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Box sx={{ p: 1, width: 200 }}>
            <Box>
              <Typography
                variant="body1"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.875rem',
                  mb: 1,
                }}
              >
                {m.attribute}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                }}
              >
                Minimum Value:
                <ExpandableNumberInput
                  max={maxState.value as number}
                  value={minState.value as number}
                  onConfirm={(newValue) =>
                    setMinState({ ...minState, value: newValue })
                  }
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 0.5,
                  fontSize: '0.875rem',
                }}
              >
                Maximum Value:
                <ExpandableNumberInput
                  min={minState.value as number}
                  value={maxState.value as number}
                  onConfirm={(newValue) =>
                    setMaxState({ ...maxState, value: newValue })
                  }
                />
              </Box>
            </Box>
          </Box>
        </Popover>
      </Paper>
    </Paper>
  )
}
