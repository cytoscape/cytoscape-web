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
import LinkIcon from '@mui/icons-material/Link'
import { ReactElement, useState, useEffect } from 'react'

import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { IdType } from '../../../models/IdType'
import {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../../models/TableModel'
import { ValueEditor } from '../../ToolBar/LayoutMenu/ValueEditor/ValueEditor'

interface EdgeCreationDialogProps {
  open: boolean
  networkId: IdType
  sourceNodeId: IdType
  targetNodeId: IdType
  onCancel: () => void
  onConfirm: (
    sourceNodeId: IdType,
    targetNodeId: IdType,
    attributes: Record<AttributeName, ValueType>,
  ) => void
}

/**
 * Dialog for creating a new edge with table field editing
 * Follows the style of CustomGraphicDialog with two-column layout
 */
export const EdgeCreationDialog = ({
  open,
  networkId,
  sourceNodeId,
  targetNodeId,
  onCancel,
  onConfirm,
}: EdgeCreationDialogProps): ReactElement => {
  const tables = useTableStore((state) => state.tables)
  const edgeTable = tables[networkId]?.edgeTable
  const nodeTable = tables[networkId]?.nodeTable

  // Get node names from table for display
  const getNodeName = (nodeId: IdType): string => {
    if (!nodeTable) return nodeId
    const nodeData = nodeTable.rows.get(nodeId)
    if (!nodeData) return nodeId
    return (
      (nodeData.name as string) ||
      (nodeData.label as string) ||
      (nodeData.nodeLabel as string) ||
      (nodeData.displayName as string) ||
      (nodeData.title as string) ||
      nodeId
    )
  }

  const sourceNodeName = getNodeName(sourceNodeId)
  const targetNodeName = getNodeName(targetNodeId)

  // Form state: track all attribute values
  const [attributes, setAttributes] = useState<
    Record<AttributeName, ValueType>
  >({})

  // Initialize default values when dialog opens or table changes
  useEffect(() => {
    if (!edgeTable || !open) return

    const defaults: Record<AttributeName, ValueType> = {}

    edgeTable.columns.forEach((column) => {
      // Set default values based on column type
      if (column.name === 'name') {
        // Default name format: "source (interacts with) target"
        defaults[column.name] = `${sourceNodeId} (interacts with) ${targetNodeId}`
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
  }, [edgeTable, open, sourceNodeId, targetNodeId])

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
    onConfirm(sourceNodeId, targetNodeId, attributes)
  }

  const hasColumns = edgeTable && edgeTable.columns.length > 0

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
          <LinkIcon color="primary" />
          <Typography variant="h6">Create Edge</Typography>
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
                  Edge Attributes
                </Typography>
              </Box>

              {!hasColumns && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    No table columns available. The edge will be created with
                    default values.
                  </Typography>
                </Alert>
              )}

              {hasColumns && (
                <List dense>
                  {edgeTable.columns.map((column) => (
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
                <strong>Source:</strong> {sourceNodeId}
                {sourceNodeName !== sourceNodeId && ` (${sourceNodeName})`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Target:</strong> {targetNodeId}
                {targetNodeName !== targetNodeId && ` (${targetNodeName})`}
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
                  {edgeTable.columns
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
          Create Edge
        </Button>
      </DialogActions>
    </Dialog>
  )
}

