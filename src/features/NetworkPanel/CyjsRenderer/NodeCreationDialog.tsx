import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { ReactElement, useState, useEffect } from 'react'

import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { IdType } from '../../../models/IdType'
import {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../../models/TableModel'
import { ValueEditor } from '../../ToolBar/LayoutMenu/ValueEditor/ValueEditor'

interface NodeCreationDialogProps {
  open: boolean
  networkId: IdType
  position: [number, number, number?]
  onCancel: () => void
  onConfirm: (
    position: [number, number, number?],
    attributes: Record<AttributeName, ValueType>,
  ) => void
}

/**
 * Dialog for creating a new node with table field editing
 * Follows the style of CustomGraphicDialog with two-column layout
 */
export const NodeCreationDialog = ({
  open,
  networkId,
  position,
  onCancel,
  onConfirm,
}: NodeCreationDialogProps): ReactElement => {
  const tables = useTableStore((state) => state.tables)
  const nodeTable = tables[networkId]?.nodeTable

  // Form state: track all attribute values
  const [attributes, setAttributes] = useState<
    Record<AttributeName, ValueType>
  >({})

  // Initialize default values when dialog opens or table changes
  useEffect(() => {
    if (!nodeTable || !open) return

    const defaults: Record<AttributeName, ValueType> = {}

    nodeTable.columns.forEach((column) => {
      // Set default values based on column type
      if (column.name === 'name') {
        // Will be set to "Node {id}" by the hook, but allow user to override
        defaults[column.name] = ''
      } else if (
        column.type === ValueTypeName.Integer ||
        column.type === ValueTypeName.Double ||
        column.type === ValueTypeName.Long
      ) {
        defaults[column.name] = 0
      } else if (column.type === ValueTypeName.Boolean) {
        defaults[column.name] = false
      } else {
        defaults[column.name] = ''
      }
    })

    setAttributes(defaults)
  }, [nodeTable, open])

  const handleAttributeChange = (
    columnName: string,
    value: ValueType,
  ): void => {
    setAttributes((prev) => ({
      ...prev,
      [columnName]: value,
    }))
  }

  const handleConfirm = (): void => {
    onConfirm(position, attributes)
  }

  const hasColumns = nodeTable && nodeTable.columns.length > 0

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={false}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon color="primary" />
          <Typography variant="h6">Create Node</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 0,
            height: '100%',
            minHeight: 400,
          }}
        >
          {/* Left Column: Form Fields */}
          <Box
            sx={{
              flex: '1 1 60%',
              overflowY: 'auto',
              borderRight: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Node Attributes
                </Typography>
              </Box>

              {!hasColumns && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    No table columns available. The node will be created with
                    default values.
                  </Typography>
                </Alert>
              )}

              {hasColumns && (
                <List dense>
                  {nodeTable.columns.map((column) => (
                    <ValueEditor
                      key={column.name}
                      optionName={column.name}
                      description={column.name}
                      valueType={column.type}
                      value={
                        attributes[column.name] !== undefined
                          ? attributes[column.name]
                          : column.type === ValueTypeName.Boolean
                            ? false
                            : column.type === ValueTypeName.Integer ||
                                column.type === ValueTypeName.Double ||
                                column.type === ValueTypeName.Long
                              ? 0
                              : ''
                      }
                      setValue={(optionName: string, value: ValueType) =>
                        handleAttributeChange(optionName, value)
                      }
                    />
                  ))}
                </List>
              )}
            </Box>
          </Box>

          {/* Right Column: Summary/Preview */}
          <Box
            sx={{
              flex: '1 1 40%',
              display: 'flex',
              flexDirection: 'column',
              p: 3,
              bgcolor: 'background.default',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}
            >
              Summary
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Position:</strong> (
                {position[0] != null ? position[0].toFixed(2) : '0.00'},{' '}
                {position[1] != null ? position[1].toFixed(2) : '0.00'})
              </Typography>
              {hasColumns && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    Attributes:
                  </Typography>
                  {nodeTable.columns
                    .filter(
                      (col) =>
                        attributes[col.name] !== undefined &&
                        attributes[col.name] !== '' &&
                        attributes[col.name] !== 0 &&
                        attributes[col.name] !== false,
                    )
                    .map((col) => (
                      <Typography
                        key={col.name}
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 2 }}
                      >
                        <strong>{col.name}:</strong>{' '}
                        {String(attributes[col.name])}
                      </Typography>
                    ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Create Node
        </Button>
      </DialogActions>
    </Dialog>
  )
}

