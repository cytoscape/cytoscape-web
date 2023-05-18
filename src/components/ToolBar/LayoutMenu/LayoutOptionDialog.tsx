import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
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
import Draggable from 'react-draggable'
import { useLayoutStore } from '../../../store/LayoutStore'
import { LayoutSelector } from './LayoutSelector'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'
import { ValueType } from '../../../models/TableModel'
import { Property } from '../../../models/PropertyModel/Property'
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'
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
  open: boolean
  setOpen: (open: boolean) => void
}

export const LayoutOptionDialog = ({
  network,
  afterLayout,
  open,
  setOpen,
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

  const engine: LayoutEngine =
    layoutEngines.find((e) => e.name === selected[0]) ?? layoutEngines[0]

  // Check if the current layout is the default layout
  const [isDefault, setIsDefault] = useState<boolean>(false)

  useEffect(() => {
    if (
      selected[0] === preferredLayout.engineName &&
      selected[1] === preferredLayout.name
    ) {
      setIsDefault(true)
    } else {
      setIsDefault(false)
    }

    const algorithm = engine.algorithms[selected[1]]

    if (algorithm?.threshold !== undefined) {
      // Disable apply button if network is too large
      const nodeCount: number = network.nodes?.length ?? 0
      const edgeCount: number = network.edges?.length ?? 0

      const total: number = nodeCount + edgeCount
      if (total > algorithm.threshold) {
        setDisabled(true)
      }
    } else {
      setDisabled(false)
    }
  }, [selected, preferredLayout, network])

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

  const [disabled, setDisabled] = useState<boolean>(false)

  const handleApply = (): void => {
    // Perform apply layout here

    if (engine === undefined) {
      return
    }
    const algorithm: LayoutAlgorithm | undefined =
      engine.algorithms[selected[1]]

    if (algorithm === undefined) {
      return
    }
    setIsRunning(true)
    engine.apply(network.nodes, network.edges, afterLayout, algorithm)
  }

  const handleDefaultChanged = (event: any): void => {
    const checked: boolean = event.target.checked
    if (checked) {
      setDefaultLayout(selected[0], selected[1])
      setIsDefault(true)
    }
  }

  const setValue = (optionName: string, value: ValueType): void => {
    const engineName: string = selected[0]
    const algorithmName: string = selected[1]
    setLayoutOption(engineName, algorithmName, optionName, value)
  }

  const { editables } = engine.algorithms[selected[1]]

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperComponent={DraggablePaper}
      aria-labelledby="draggable-dialog-title"
    >
      <DialogTitle
        sx={{
          padding: 1,
        }}
      >
        Layout Option Editor
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ margin: 0, padding: 1, paddingTop: 0 }}>
        <Grid container spacing={0} alignItems={'center'}>
          <Grid item md={12}>
            <LayoutSelector
              selectedEngine={selected[0]}
              selectedAlgorithm={selected[1]}
              setSelected={setSelectedAlgorithm}
            />
          </Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isDefault}
                  disabled={isDefault}
                  onChange={handleDefaultChanged}
                />
              }
              label="Set as default"
            />
          </Grid>
        </Grid>

        <List dense>
          {Object.keys(editables === undefined ? {} : editables).map(
            (propName: string) => {
              if (editables === undefined) {
                return null
              }
              const property: Property<ValueType> = editables[propName]
              return (
                <ValueEditor
                  key={property.name}
                  optionName={property.name}
                  description={property.description ?? property.name}
                  valueType={property.type}
                  value={property.value}
                  setValue={(optionName: string, value: ValueType) =>
                    setValue(optionName, value)
                  }
                />
              )
            },
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="info">
          Close
        </Button>
        <Button disabled={disabled} onClick={handleApply} color="secondary">
          Apply Layout
        </Button>
      </DialogActions>
    </Dialog>
  )
}
