import {
  Box,
  Tooltip,
  TextField,
  Button,
  CircularProgress,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { ReactElement, useState, useEffect } from 'react'

import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps'
import { ColumnAppendForm } from './ColumnAppendTypeForm'
import { ColumnAppendType } from '../model/ColumnAppendType'

export const CreateNetworkFromTableFileMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [showDialog, setShowDialog] = useState(false)

  const content = (
    <Dialog
      maxWidth="sm"
      fullWidth={true}
      open={showDialog}
      onClose={props.handleClose}
    >
      <DialogTitle>LLM Query Options</DialogTitle>
      <DialogContent sx={{ p: 1 }}>
        <ColumnAppendForm
          value={ColumnAppendType.Key}
          onChange={() => {}}
          validValues={Object.values(ColumnAppendType)}
        />
      </DialogContent>
      <DialogActions></DialogActions>
    </Dialog>
  )

  return (
    <>
      <MenuItem onClick={() => setShowDialog(true)}>
        Upload network from table file
      </MenuItem>
      {content}
    </>
  )
}
