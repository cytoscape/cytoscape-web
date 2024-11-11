import { Box, Button, DialogActions } from "@mui/material"
import { ReactElement } from "react"
import { IdType } from "src/models"

interface LoadFromNdexDialogFooterProps {
  selectedNetworks: IdType[]
  successMessage?: string
  errorMessage?: string
  onClose: () => void
  onImport: () => void
}

const LoadFromNdexDialogFooter = ({
  selectedNetworks,
  successMessage,
  errorMessage,
  onClose,
  onImport,
}: LoadFromNdexDialogFooterProps): ReactElement => (
  <DialogActions
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <Box sx={{ pl: 2 }}>{successMessage ?? errorMessage ?? ''}</Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Button color="error" onClick={onClose} sx={{ mr: 7 }}>
        Cancel
      </Button>
      <Button
        disabled={selectedNetworks.length === 0}
        onClick={onImport}
      >
        {`Open ${selectedNetworks.length} Network(s)`}
      </Button>
    </Box>
  </DialogActions>
)

export default LoadFromNdexDialogFooter;