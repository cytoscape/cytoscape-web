import { MenuItem as NestedMenuItem } from 'primereact/menuitem'
import { MenuPathElement } from '../../../models/AppModel/MenuPathElement'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { IdType } from 'src/models'
import { ServiceAppParameter } from '../../../models/AppModel/ServiceAppParameter'
import { useTableStore } from '../../../store/TableStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { ParameterUiType } from '../../../models/AppModel/ParameterUiType'
import { useAppStore } from '../../../store/AppStore'

interface AppMenuItemProps {
  handleClose: () => void
  handleConfirm: () => Promise<void>
  app: ServiceApp
  open: boolean
}

export const AppMenuItemDialog: React.FC<AppMenuItemProps> = ({
  handleClose,
  handleConfirm,
  app,
  open,
}) => {
  const isNodeType = app.serviceInputDefinition?.type === 'node'
  const isEdgeType = app.serviceInputDefinition?.type === 'edge'
  const inputTypeIsElement = (isNodeType || isEdgeType) ?? false

  const updateServiceParameter = useAppStore(
    (state) => state.updateServiceParameter,
  )

  const updateInputColumn = useAppStore((state) => state.updateInputColumn)
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const nodeColumns =
    useTableStore(
      (state) => state.tables?.[activeNetworkId]?.nodeTable?.columns,
    ) ?? []

  const edgeColumns =
    useTableStore(
      (state) => state.tables?.[activeNetworkId]?.nodeTable?.columns,
    ) ?? []

  const renderParameter = (parameter: ServiceAppParameter) => {
    switch (parameter.type) {
      case ParameterUiType.Text:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <TextField
              label={parameter.displayName}
              value={parameter.value ?? parameter.defaultValue ?? ''}
              defaultValue={parameter.defaultValue ?? ''}
              onChange={(e) =>
                updateServiceParameter(
                  app.url,
                  parameter.displayName,
                  e.target.value,
                )
              }
            />
          </Tooltip>
        )
      case ParameterUiType.DropDown:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <Select label={parameter.displayName} value={parameter.value || ''}>
              {(parameter.valueList ?? []).map((value, i) => (
                <MenuItem
                  key={i}
                  onClick={() =>
                    updateServiceParameter(
                      app.url,
                      parameter.displayName,
                      value,
                    )
                  }
                >
                  {value}
                </MenuItem>
              ))}
            </Select>
          </Tooltip>
        )
      case ParameterUiType.Radio:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <RadioGroup
              value={parameter.value || ''}
              onChange={(e) =>
                updateServiceParameter(
                  app.url,
                  parameter.displayName,
                  e.target.value,
                )
              }
            >
              {(parameter.valueList ?? []).map((value, i) => (
                <FormControlLabel
                  key={i}
                  value={value}
                  control={<Radio />}
                  label={value}
                />
              ))}
            </RadioGroup>
          </Tooltip>
        )
      case ParameterUiType.CheckBox:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    parameter.value === 'true' ||
                    parameter.defaultValue === 'true' ||
                    false
                  }
                  onChange={(e) =>
                    updateServiceParameter(
                      app.url,
                      parameter.displayName,
                      `${e.target.checked}`,
                    )
                  }
                />
              }
              label={parameter.displayName}
            />
          </Tooltip>
        )

      case ParameterUiType.NodeColumn:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <Select label={parameter.displayName} value={parameter.value || ''}>
              {nodeColumns.map((column, i) => (
                <MenuItem
                  key={i}
                  onClick={() =>
                    updateServiceParameter(
                      app.url,
                      parameter.displayName,
                      column.name,
                    )
                  }
                >
                  {column.name}
                </MenuItem>
              ))}
            </Select>
          </Tooltip>
        )
      case ParameterUiType.EdgeColumn:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <Select label={parameter.displayName} value={parameter.value || ''}>
              {edgeColumns.map((column, i) => (
                <MenuItem
                  key={i}
                  onClick={() =>
                    updateServiceParameter(
                      app.url,
                      parameter.displayName,
                      column.name,
                    )
                  }
                >
                  {column.name}
                </MenuItem>
              ))}
            </Select>
          </Tooltip>
        )
      default:
        return null
    }
  }

  const handleSubmit = () => {
    handleConfirm()
    handleClose()
  }

  const inputColumnsRender = () => {
    return app.serviceInputDefinition?.inputColumns.map((inputColumn, i) => {
      return (
        <Select label={inputColumn.name} value={inputColumn.columnName}>
          {(isNodeType ? nodeColumns : edgeColumns).map((eleColumn, i) => {
            return (
              <MenuItem
                key={i}
                onClick={() =>
                  updateInputColumn(app.url, inputColumn.name, eleColumn.name)
                }
              >
                {eleColumn.name}
              </MenuItem>
            )
          })}
        </Select>
      )
    })
  }

  const inputDefinition = inputTypeIsElement ? (
    <Box>
      <Typography>Input Columns</Typography>
      {inputColumnsRender()}
    </Box>
  ) : null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h5">{app.name}</Typography>
        {inputDefinition}
        <Box sx={{ p: 1 }}>
          <Typography>Parameters</Typography>
          {app.parameters.map((parameter: ServiceAppParameter) => (
            <Box key={parameter.displayName} style={{ marginBottom: '20px' }}>
              {renderParameter(parameter)}
            </Box>
          ))}
          <Button onClick={handleSubmit} color="primary" variant="contained">
            Submit
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}

export const AppMenuItem: React.FC<{
  handleClose: () => void
  handleConfirm: () => Promise<void>
  app: ServiceApp
}> = (props: AppMenuItemProps) => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const { handleClose, app } = props
  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    handleClose() // Call handleClose from props if needed
  }

  return (
    <>
      <MenuItem onClick={() => handleOpenDialog()}>{app.name}</MenuItem>
      <AppMenuItemDialog
        handleConfirm={props.handleConfirm}
        open={openDialog}
        handleClose={handleCloseDialog}
        app={app}
      />
    </>
  )
}

const path2menu = (
  app: ServiceApp,
  path: MenuPathElement[],
  commandFn: (url: string) => Promise<void>,
): NestedMenuItem => {
  const { url } = app
  if (path.length === 0) {
    throw new Error('Menu path is empty')
  }

  const command = async (): Promise<void> => {
    // Call the function to open the modal parameter dialog here...
    // open()
    // Run the task from the Dialog...

    // After the dialog is closed, close the parent menu
    await commandFn(url)
    console.log('## Task finished!')
  }

  // Case 1: Single menu item
  if (path.length === 1) {
    const item: MenuPathElement = path[0]
    const baseMenu: NestedMenuItem = {
      label: item.name,
      items: [],
      template: (
        <AppMenuItem handleConfirm={command} handleClose={() => {}} app={app} />
      ),
    }
    return baseMenu
  }

  // Case 2: Depth > 1

  const baseMenu: NestedMenuItem = {
    label: path[0].name,
    items: [],
  }

  let currentMenuItem: NestedMenuItem = baseMenu
  for (let i = 1; i < path.length; i++) {
    const item: MenuPathElement = path[i]
    const newMenuItem: NestedMenuItem = {
      label: item.name,
      items: [],
    }
    if (path.length === i + 1) {
      newMenuItem.template = (
        <AppMenuItem handleClose={() => {}} app={app} handleConfirm={command} />
      )
    }
    if (currentMenuItem.items === undefined) {
      currentMenuItem.items = []
    }
    currentMenuItem.items = [newMenuItem]
    currentMenuItem = newMenuItem
  }
  return baseMenu
}

export const createMenuItems = (
  serviceApps: Record<string, ServiceApp>,
  commandFn: (url: string) => Promise<void>,
): NestedMenuItem[] => {
  let baseMenu: NestedMenuItem = { label: 'No menu items', items: [] }
  const appIds: string[] = Object.keys(serviceApps)

  // Sort the appIds based on gravity of the top menu item
  const sortedAppIds = appIds.sort((a, b) => {
    const gravityA = serviceApps[a].cyWebMenuItem.path[0].gravity
    const gravityB = serviceApps[b].cyWebMenuItem.path[0].gravity
    return gravityA - gravityB
  })

  const appMenuItems: NestedMenuItem[] = []
  sortedAppIds.forEach((appId: string) => {
    const app: ServiceApp = serviceApps[appId]
    const { cyWebMenuItem } = app
    const { path } = cyWebMenuItem
    baseMenu = path2menu(app, path, commandFn)
    appMenuItems.push(baseMenu)
  })

  return appMenuItems
}
