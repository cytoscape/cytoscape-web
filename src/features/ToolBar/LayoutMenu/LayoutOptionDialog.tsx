import {
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  List,
  Paper,
  PaperProps,
} from '@mui/material'
import { useEffect, useState } from 'react'
import Draggable from 'react-draggable'

import { CyDialog } from '@/components/CyDialog'
import { useLayoutStore } from '../../../data/hooks/stores/LayoutStore'
import { IdType } from '../../../models/IdType'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'
import { Network } from '../../../models/NetworkModel'
import { Property } from '../../../models/PropertyModel/Property'
import { ValueType } from '../../../models/TableModel'
import { LayoutSelector } from './LayoutSelector'
import { runEngineLayout } from './runEngineLayout'
import { ValueEditor } from './ValueEditor/ValueEditor'

const DraggablePaper = (props: PaperProps): JSX.Element => {
  return (
    <Draggable
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} />
    </Draggable>
  )
}

interface LayoutOptionDialogProps {
  afterLayout: (positionMap: Map<IdType, [number, number]>) => void
  network: Network
  /** The network being laid out; app engines need it for the run context. */
  networkId: IdType
  open: boolean
  setOpen: (open: boolean) => void
  allDisabled: boolean
}

export const LayoutOptionDialog = ({
  network,
  networkId,
  afterLayout,
  open,
  setOpen,
  allDisabled,
}: LayoutOptionDialogProps): JSX.Element => {
  const preferredLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredLayout,
  )

  const [selected, setSelected] = useState<[string, string]>([
    preferredLayout.engineName,
    preferredLayout.name,
  ])

  const setSelectedAlgorithm = (
    engineName: string,
    algorithmName: string,
  ): void => {
    setSelected([engineName, algorithmName])
  }

  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  // The selection is resolved against the store on every render: the
  // selected algorithm can disappear while the dialog is open (an app that
  // registered it was disabled), in which case the dialog shows the
  // preferred layout instead of dereferencing a missing algorithm.
  const requestedAlgorithm: LayoutAlgorithm | undefined = layoutEngines.find(
    (e) => e.name === selected[0],
  )?.algorithms[selected[1]]
  const effectiveSelected: [string, string] =
    requestedAlgorithm !== undefined
      ? selected
      : [preferredLayout.engineName, preferredLayout.name]
  const [selectedEngineName, selectedAlgorithmName] = effectiveSelected

  const engine: LayoutEngine | undefined =
    layoutEngines.find((e) => e.name === selectedEngineName) ?? layoutEngines[0]
  const algorithm: LayoutAlgorithm | undefined =
    engine?.algorithms[selectedAlgorithmName]

  // Check if the current layout is the default layout
  const [isDefault, setIsDefault] = useState<boolean>(false)
  const [disabled, setDisabled] = useState<boolean>(false)

  useEffect(() => {
    setIsDefault(
      selectedEngineName === preferredLayout.engineName &&
        selectedAlgorithmName === preferredLayout.name,
    )

    // Disable the apply button when the network is too large for the
    // algorithm; re-enable it otherwise (a previous over-threshold selection
    // must not leave the button stuck).
    const nodeCount: number = network.nodes?.length ?? 0
    const edgeCount: number = network.edges?.length ?? 0
    const total: number = nodeCount + edgeCount
    setDisabled(
      algorithm?.threshold !== undefined && total > algorithm.threshold,
    )
  }, [
    selectedEngineName,
    selectedAlgorithmName,
    preferredLayout,
    network,
    algorithm,
  ])

  const setDefaultLayout: (engineName: string, algorithmName: string) => void =
    useLayoutStore((state) => state.setPreferredLayout)

  const setLayoutOption: <T extends ValueType>(
    engineName: string,
    algorithmName: string,
    propertyName: string,
    propertyValue: T,
  ) => void = useLayoutStore((state) => state.setLayoutOption)

  const handleClose = (): void => {
    setOpen(false)
  }

  const handleApply = (): void => {
    if (engine === undefined || algorithm === undefined) {
      return
    }
    runEngineLayout({
      engine,
      algorithm,
      network,
      networkId,
      afterLayout,
      setIsRunning,
    })
  }

  const handleDefaultChanged = (event: any): void => {
    const checked: boolean = event.target.checked
    if (checked) {
      setDefaultLayout(selectedEngineName, selectedAlgorithmName)
      setIsDefault(true)
    }
  }

  const setValue = (optionName: string, value: ValueType): void => {
    setLayoutOption(
      selectedEngineName,
      selectedAlgorithmName,
      optionName,
      value,
    )
  }

  const editables: Record<string, Property<ValueType>> = algorithm?.editables ??
  {}

  return (
    <CyDialog
      data-testid="layout-option-dialog"
      open={open}
      PaperComponent={DraggablePaper}
      aria-labelledby="draggable-dialog-title"
    >
      <DialogTitle>Layout Option Editor</DialogTitle>
      <Divider />

      <DialogContent
        sx={{
          margin: 1.5,
          padding: 1,
          paddingTop: 0,
          marginTop: 0.5,
          overflowY: 'clip',
        }}
      >
        <Grid container spacing={0} alignItems={'center'}>
          <Grid item md={12}>
            <LayoutSelector
              selectedEngine={selectedEngineName}
              selectedAlgorithm={selectedAlgorithmName}
              setSelected={setSelectedAlgorithm}
            />
          </Grid>
          <Grid sx={{ paddingTop: '8px' }}>
            <FormControlLabel
              control={
                <Checkbox
                  data-testid="layout-option-dialog-set-default-checkbox"
                  checked={isDefault}
                  disabled={isDefault}
                  onChange={handleDefaultChanged}
                />
              }
              label="Set as default"
              labelPlacement="start"
            />
          </Grid>
        </Grid>

        <List dense>
          {Object.keys(editables).map((propName: string) => {
            const property: Property<ValueType> = editables[propName]
            return (
              <ValueEditor
                key={property.name}
                optionName={property.name}
                label={property.displayName}
                description={property.description ?? property.name}
                valueType={property.type}
                value={property.value}
                setValue={(optionName: string, value: ValueType) =>
                  setValue(optionName, value)
                }
              />
            )
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="layout-option-dialog-close-button"
          variant="outlined"
          onClick={handleClose}
        >
          Close
        </Button>
        <Button
          data-testid="layout-option-dialog-apply-button"
          variant="contained"
          disabled={allDisabled || disabled}
          onClick={handleApply}
        >
          Apply Layout
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
