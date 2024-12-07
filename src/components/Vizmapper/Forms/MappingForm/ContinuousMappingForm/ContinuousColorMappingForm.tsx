import * as React from 'react'
import {
  Button,
  Box,
  Typography,
  Paper,
  Popover,
  IconButton,
  Tooltip,
} from '@mui/material'
import { scaleLinear } from '@visx/scale'
import { extent } from 'd3-array'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import Delete from '@mui/icons-material/DisabledByDefault'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import Palette from '@mui/icons-material/Palette'
import EditIcon from '@mui/icons-material/Edit'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import RdBu from '../../../../../assets/RdBu.png'
import PuOr from '../../../../../assets/PuOr.png'
import PRGn from '../../../../../assets/PRGn.png'
import Spectral from '../../../../../assets/Spectral.png'
import BrBG from '../../../../../assets/BrBG.png'
import RdYlGn from '../../../../../assets/RdYlGn.png'
import PiYG from '../../../../../assets/PiYG.png'
import RdGy from '../../../../../assets/RdGy.png'
import RdYlBu from '../../../../../assets/RdYlBu.png'

import { color } from 'd3-color'
import Draggable from 'react-draggable'
import { debounce, isError, set } from 'lodash'

import { IdType } from '../../../../../models/IdType'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../../models/VisualStyleModel'
import { ContinuousMappingFunction } from '../../../../../models/VisualStyleModel/VisualMappingFunction'
import { ContinuousFunctionControlPoint } from '../../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'

import { VisualPropertyValueForm } from '../../VisualPropertyValueForm'
import { useVisualStyleStore } from '../../../../../store/VisualStyleStore'

import { ColorGradient } from './ColorGradient'
import { Handle, addHandle, editHandle, removeHandle } from './Handle'

import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import { ExpandableNumberInput } from './ExpandableNumberInput'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft'
import ArrowRightIcon from '@mui/icons-material/ArrowRight'

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
  const [createColorPickerAnchorEl, setColorPickerAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)

  const showMinMaxMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setEditMinMaxAnchorEl(event.currentTarget)
  }

  const hideMinMaxMenu = (): void => {
    setEditMinMaxAnchorEl(null)
  }

  const showColorPickerMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setColorPickerAnchorEl(event.currentTarget)
  }

  const hideColorPickerMenu = (): void => {
    setColorPickerAnchorEl(null)
  }

  const showCreateHandleMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setCreateHandleAnchorEl(event.currentTarget)
  }

  const hideCreateHandleMenu = (): void => {
    setCreateHandleAnchorEl(null)
  }

  const [isColorBlindChecked, setIsColorBlindChecked] = React.useState(false)

  const handleColorBlindCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setIsColorBlindChecked(event.target.checked)
  }

  const [isReverseColorChecked, setIsReverseColorChecked] =
    React.useState(false)

  const handleReverseColorCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setIsReverseColorChecked(event.target.checked)
  }

  const [minPalette, setMinPalette] = React.useState(min.vpValue)
  const [middlePalette, setMiddlePalette] = React.useState(
    controlPoints[1].vpValue,
  )
  const [maxPalette, setMaxPalette] = React.useState(max.vpValue)
  const [textPalette, setTextPalette] = React.useState('None')

  const [buttonText, setButtonText] = React.useState(textPalette)
  const changeButtonText = (text: string): void => setButtonText(text)

  const handleColorPicker = (): void => {
    if (!isReverseColorChecked) {
      setMinState({
        ...minState,
        vpValue: maxPalette,
      })
      setMaxState({
        ...maxState,
        vpValue: minPalette,
      })
      setHandle(0, min.value as number, maxPalette as string)
      setHandle(1, controlPoints[1].value as number, middlePalette as string)
      setHandle(2, max.value as number, minPalette as string)
      changeButtonText(textPalette)
      hideColorPickerMenu()
    } else {
      setMinState({
        ...minState,
        vpValue: minPalette,
      })
      setMaxState({
        ...maxState,
        vpValue: maxPalette,
      })
      setHandle(0, min.value as number, minPalette as string)
      setHandle(1, controlPoints[1].value as number, middlePalette as string)
      setHandle(2, max.value as number, maxPalette as string)
      changeButtonText(textPalette)
      hideColorPickerMenu()
    }
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
            ltMinVpValue,
            gtMaxVpValue,
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
          }
        }),
    )
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

  const [colorPalette, setColorPalette] = React.useState('')

  const handleColorPalette = (
    event: React.MouseEvent<HTMLElement>,
    newColorPalette: string | null,
  ): void => {
    if (newColorPalette !== null) {
      setColorPalette(newColorPalette)
    }
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
  }, [handles])

  // anytime someone changes the min value, make sure all handle values are greater than the min
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
    setAddHandleFormValue(minState.value as number)
  }, [minState])

  // anytime someone changes the max value, make sure all handle values are less than the max
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
    setAddHandleFormValue(minState.value as number)
  }, [maxState])

  return (
    <Paper sx={{ backgroundColor: '#D9D9D9', p: 2, pr: 8, pl: 8 }}>
      <Paper
        sx={{
          display: 'flex',
          p: 1,
          m: 1,
          ml: 3,
          mr: 3,
          justifyContent: 'center',
          backgroundColor: '#fcfffc',
          color: '#595858',
        }}
      >
        Current Palette:&ensp;
        <Button
          onClick={showColorPickerMenu}
          variant="outlined"
          sx={{ color: '#63a5e8' }}
          size="small"
          startIcon={<Palette />}
        >
          {buttonText}
        </Button>
        <Popover
          open={createColorPickerAnchorEl != null}
          anchorEl={createColorPickerAnchorEl}
          onClose={hideColorPickerMenu}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Typography align={'center'} sx={{ p: 1 }}>
            Set Palette
          </Typography>
          <ToggleButtonGroup
            value={colorPalette}
            onChange={handleColorPalette}
            orientation="horizontal"
            exclusive
            fullWidth={true}
          >
            <ToggleButton
              value="rdbu"
              aria-label="RdBu"
              onClick={() => {
                setMinPalette('#b2182b')
                setMiddlePalette('#f7f7f7')
                setMaxPalette('#2166ac')
                setTextPalette('Red-Blue')
              }}
            >
              <Tooltip title="Red-Blue" placement="right">
                <img src={RdBu} width="15" height="150" />
              </Tooltip>
            </ToggleButton>

            <ToggleButton
              value="puor"
              aria-label="PuOr"
              onClick={() => {
                setMinPalette('#542788')
                setMiddlePalette('#f7f7f7')
                setMaxPalette('#b35806')
                setTextPalette('Purple-Orange')
              }}
            >
              <Tooltip title="Purple-Orange" placement="right">
                <img src={PuOr} width="15" height="150" />
              </Tooltip>
            </ToggleButton>

            <ToggleButton
              value="prgn"
              aria-label="PRGn"
              onClick={() => {
                setMinPalette('#762a83')
                setMiddlePalette('#f7f7f7')
                setMaxPalette('#1b7837')
                setTextPalette('Purple-Red-Green')
              }}
            >
              <Tooltip title="Purple-Red-Green" placement="right">
                <img src={PRGn} width="15" height="150" />
              </Tooltip>
            </ToggleButton>

            {!isColorBlindChecked && (
              <ToggleButton
                value="spectral"
                aria-label="Spectral"
                onClick={() => {
                  setMinPalette('#d53e4f')
                  setMiddlePalette('#ffffbf')
                  setMaxPalette('#3288bd')
                  setTextPalette('Spectral Colors')
                }}
              >
                <Tooltip title="Spectral Colors" placement="right">
                  <img src={Spectral} width="15" height="150" />
                </Tooltip>
              </ToggleButton>
            )}

            <ToggleButton
              value="brbg"
              aria-label="BrBG"
              onClick={() => {
                setMinPalette('#8c510a')
                setMiddlePalette('#f5f5f5')
                setMaxPalette('#01665e')
                setTextPalette('Brown-Blue-Green')
              }}
            >
              <Tooltip title="Brown-Blue-Green" placement="right">
                <img src={BrBG} width="15" height="150" />
              </Tooltip>
            </ToggleButton>

            {!isColorBlindChecked && (
              <ToggleButton
                value="rdylgn"
                aria-label="RdYlGn"
                onClick={() => {
                  setMinPalette('#d73027')
                  setMiddlePalette('#ffffbf')
                  setMaxPalette('#1a9850')
                  setTextPalette('Red-Yellow-Green')
                }}
              >
                <Tooltip title="Red-Yellow-Green" placement="right">
                  <img src={RdYlGn} width="15" height="150" />
                </Tooltip>
              </ToggleButton>
            )}

            <ToggleButton
              value="piyg"
              aria-label="PiYG"
              onClick={() => {
                setMinPalette('#c51b7d')
                setMiddlePalette('#f7f7f7')
                setMaxPalette('#4d9221')
                setTextPalette('Magenta-Yellow-Green')
              }}
            >
              <Tooltip title="Magenta-Yellow-Green" placement="right">
                <img src={PiYG} width="15" height="150" />
              </Tooltip>
            </ToggleButton>

            {!isColorBlindChecked && (
              <ToggleButton
                value="rdgy"
                aria-label="RdGy"
                onClick={() => {
                  setMinPalette('#b2182b')
                  setMiddlePalette('#ffffff')
                  setMaxPalette('#4d4d4d')
                  setTextPalette('Red-Grey')
                }}
              >
                <Tooltip title="Red-Grey" placement="right">
                  <img src={RdGy} width="15" height="150" />
                </Tooltip>
              </ToggleButton>
            )}

            <ToggleButton
              value="rdylbu"
              aria-label="RdYlBu"
              onClick={() => {
                setMinPalette('#d73027')
                setMiddlePalette('#ffffbf')
                setMaxPalette('#4575b4')
                setTextPalette('Red-Yellow-Blue')
              }}
            >
              <Tooltip title="Red-Yellow-Blue" placement="right">
                <img src={RdYlBu} width="15" height="150" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <Paper
            sx={{
              display: 'flex',
              p: 1,
              m: 1,
              ml: 3,
              mr: 3,
              justifyContent: 'space-evenly',
              backgroundColor: '#fcfffc',
              color: '#595858',
            }}
          >
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isReverseColorChecked}
                    onChange={handleReverseColorCheckboxChange}
                  />
                }
                label="reverse colors"
              />
            </FormGroup>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isColorBlindChecked}
                    onChange={handleColorBlindCheckboxChange}
                  />
                }
                label="colorblind-friendly"
              />
            </FormGroup>
          </Paper>
          <Paper
            sx={{
              display: 'flex',
              p: 1,
              m: 1,
              ml: 3,
              mr: 3,
              justifyContent: 'space-evenly',
              backgroundColor: '#fcfffc',
              color: '#595858',
            }}
          >
            <Button
              color="primary"
              onClick={() => {
                hideColorPickerMenu()
              }}
              size="small"
            >
              Cancel
            </Button>
            <Button
              sx={{
                color: '#FFFFFF',
                backgroundColor: '#337ab7',
                '&:hover': {
                  backgroundColor: '#285a9b',
                },
              }}
              onClick={() => {
                handleColorPicker()
              }}
              size="small"
            >
              Confirm
            </Button>
          </Paper>
        </Popover>
      </Paper>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          pt: 11.5,
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
          }}
          elevation={4}
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
                  onStart={(e) => {
                    setlastDraggedHandleId(h.id)
                  }}
                  onStop={(e) => {
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
                      elevation={4}
                      sx={{
                        p: 0.5,
                        position: 'relative',
                        top: -195,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        border: '0.5px solid #03082d',
                        zIndex:
                          lastDraggedHandleId === h.id
                            ? 3
                            : isEndHandle
                              ? 1
                              : 2,
                      }}
                    >
                      {handles.length >= 3 && !isEndHandle ? (
                        <Delete
                          onClick={() => {
                            deleteHandle(h.id)
                          }}
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            color: '#03082d',
                            fontSize: 22,
                            '&:hover': {
                              cursor: 'pointer',
                              color: '#3d0303',
                            },
                          }}
                        />
                      ) : !isEndHandle ? (
                        <Delete
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            color: 'rgba(0, 0, 0, 0.3)',
                            fontSize: 22,
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
                          color: isEndHandle ? '#D9D9D9' : '#03082d',
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
                  sx={{ fontSize: 40, position: 'absolute', left: -25 }}
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
                  sx={{ fontSize: 40, position: 'absolute', left: 35 }}
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
        sx={{
          display: 'flex',
          p: 1,
          m: 1,
          ml: 3,
          mr: 3,
          justifyContent: 'space-evenly',
          backgroundColor: '#fcfffc',
          color: '#595858',
        }}
      >
        <Button
          onClick={showCreateHandleMenu}
          variant="outlined"
          sx={{ color: '#63a5e8' }}
          size="small"
          startIcon={<AddCircleIcon />}
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
              width: 180,
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
                {m.attribute}
                <ExpandableNumberInput
                  value={addHandleFormValue}
                  onConfirm={(newValue) => setAddHandleFormValue(newValue)}
                  min={minState.value as number}
                  max={maxState.value as number}
                ></ExpandableNumberInput>
              </Box>
              <Box
                sx={{
                  mt: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                {props.visualProperty.displayName}
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
          sx={{ color: '#63a5e8' }}
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
          <Box sx={{ p: 1 }}>
            <Box>
              <Typography variant="body1">{m.attribute}</Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {'Minimum Value'}
                <ExpandableNumberInput
                  max={maxState.value as number}
                  value={minState.value as number}
                  onConfirm={(newValue) =>
                    setMinState({ ...minState, value: newValue })
                  }
                ></ExpandableNumberInput>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 1,
                }}
              >
                {'Maximum Value'}
                <ExpandableNumberInput
                  min={minState.value as number}
                  value={maxState.value as number}
                  onConfirm={(newValue) =>
                    setMaxState({ ...maxState, value: newValue })
                  }
                ></ExpandableNumberInput>
              </Box>
            </Box>
          </Box>
        </Popover>
      </Paper>
    </Paper>
  )
}
