import { useState } from 'react'
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
import { ValueEditor } from './ValueEditor'
import { ValueType } from '../../../models/TableModel'
import { Property } from '../../../models/PropertyModel/Property'
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'

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
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  const defEngine = layoutEngines.find(
    (engine) => engine.name === preferredLayout.engineName,
  )

  // const defAlgorithm =
  //   defEngine?.getAlgorithm(preferredLayout[1]) ??
  //   layoutEngines[0].getAlgorithm(layoutEngines[0].algorithmNames[0])
  const [engine, setEngine] = useState<LayoutEngine | undefined>(defEngine)
  const [algorithm, setAlgorithm] = useState<LayoutAlgorithm>(preferredLayout)

  const setDefaultLayout: (engineName: string, algorithmName: string) => void =
    useLayoutStore((state) => state.setPreferredLayout)

  const handleClose = (): void => {
    // setOpen(false)
  }

  const handleUpdate = (): void => {
    // Perform update logic here
    setOpen(false)
  }

  const handleChange = (engineName: string, algorithmName: string): void => {
    setDefaultLayout(engineName, algorithmName)

    const newEngine = layoutEngines.find((e) => e.name === engineName)
    if (newEngine === undefined) {
      return
    }

    setEngine(newEngine)

    const newAlgorithm: LayoutAlgorithm = newEngine.getAlgorithm(algorithmName)
    if (newAlgorithm === undefined) {
      return
    }

    setAlgorithm(newAlgorithm)
  }

  const handleApply = (): void => {
    // Perform apply layout here

    engine?.apply(network.nodes, network.edges, afterLayout, algorithm.name)
  }

  const { editables } = algorithm
  let editableList: Array<Property<ValueType>> = []
  if (editables !== undefined) {
    editableList = editables
  }
  return (
    <Dialog
      maxWidth={'md'}
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
          <Grid md={12}>
            <LayoutSelector
              title={'Preferred Layout'}
              setLayout={handleChange}
            />
          </Grid>
          <Grid>
            <FormControlLabel
              control={<Checkbox defaultChecked />}
              label="Set as default"
            />
          </Grid>
        </Grid>

        <List dense>
          {editableList.map((property: Property<ValueType>) => {
            return (
              <ValueEditor
                key={property.name}
                optionName={property.name}
                valueType={property.type}
                value={property.value}
                setValue={(value: ValueType) => {}}
              />
            )
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="info">
          Close
        </Button>
        <Button onClick={handleUpdate} color="primary">
          Update
        </Button>
        <Button onClick={handleApply} color="secondary">
          Apply Layout
        </Button>
      </DialogActions>
    </Dialog>
  )
}
