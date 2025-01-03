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
import { inputColumnFilterFn } from '../../../models/AppModel/impl'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import React from 'react'

interface AppMenuItemProps {
  handleClose: () => void
  handleConfirm: () => Promise<void>
  app: ServiceApp
  open: boolean
}

export const InputColumns = (props: AppMenuItemProps) => {
  const { app } = props
  const isNodeType = app.serviceInputDefinition?.type === 'node'
  const isEdgeType = app.serviceInputDefinition?.type === 'edge'
  const inputTypeIsElement = (isNodeType || isEdgeType) ?? false

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

  React.useEffect(() => {
    app.serviceInputDefinition?.inputColumns.forEach((inputColumn) => {
      const validColumns = (isNodeType ? nodeColumns : edgeColumns).filter(
        (c) => inputColumnFilterFn(c, inputColumn),
      )
      if (validColumns.length > 0) {
        updateInputColumn(app.url, inputColumn.name, validColumns[0].name)
      }
    })
  }, [])

  return app.serviceInputDefinition?.inputColumns.map((inputColumn, i) => {
    const validColumns = (isNodeType ? nodeColumns : edgeColumns).filter((c) =>
      inputColumnFilterFn(c, inputColumn),
    )

    if (validColumns.length === 0) {
      return (
        <Tooltip
          key={i}
          title={`The network needs to have a column that satisfies the data type ${inputColumn.dataType}`}
        >
          <Box sx={{ p: 1 }}>
            <Select
              disabled
              size="small"
              label={inputColumn.name}
              value={inputColumn.columnName}
            ></Select>
          </Box>
        </Tooltip>
      )
    }
    const columnsToDisplay = isNodeType ? nodeColumns : edgeColumns

    return (
      <Tooltip key={i} title={inputColumn.description ?? ''}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography>{`${inputColumn.name}`}</Typography>
          <Select
            displayEmpty
            size="small"
            sx={{ width: 200 }}
            value={
              inputColumn.columnName ??
              (isNodeType ? nodeColumns?.[0] : edgeColumns?.[0]) ??
              inputColumn.defaultColumnName
            }
            onChange={(e) => {
              updateInputColumn(app.url, inputColumn.name, e.target.value)
            }}
          >
            {columnsToDisplay.map((eleColumn, i) => {
              return (
                <MenuItem key={i} value={eleColumn.name}>
                  {eleColumn.name}
                </MenuItem>
              )
            })}
          </Select>
        </Box>
      </Tooltip>
    )
  })
}

export const AppMenuItemDialog: React.FC<AppMenuItemProps> = (props) => {
  const { handleClose, handleConfirm, app, open } = props
  const isNodeType = app.serviceInputDefinition?.type === 'node'
  const isEdgeType = app.serviceInputDefinition?.type === 'edge'
  const inputTypeIsElement = (isNodeType || isEdgeType) ?? false

  const workspace = useWorkspaceStore((state) => state.workspace)
  const numNetworks = workspace.networkIds.length
  const updateServiceParameter = useAppStore(
    (state) => state.updateServiceParameter,
  )

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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>{parameter.displayName}</Typography>
              <TextField
                size="small"
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
            </Box>
          </Tooltip>
        )
      case ParameterUiType.DropDown:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>{parameter.displayName}</Typography>
              <Select
                size="small"
                label={parameter.displayName}
                value={parameter.value || ''}
              >
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
            </Box>
          </Tooltip>
        )
      case ParameterUiType.Radio:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>{parameter.displayName}</Typography>
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
            </Box>
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
              labelPlacement="start"
              sx={{
                marginLeft: '0px !important',
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              }}
            />
          </Tooltip>
        )

      case ParameterUiType.NodeColumn:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>{parameter.displayName}</Typography>
              <Select
                size="small"
                label={parameter.displayName}
                value={parameter.value || ''}
              >
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
            </Box>
          </Tooltip>
        )
      case ParameterUiType.EdgeColumn:
        return (
          <Tooltip title={parameter.description ?? ''}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>{parameter.displayName}</Typography>
              <Select
                size="small"
                label={parameter.displayName}
                value={parameter.value || ''}
              >
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
            </Box>
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

  const networkHasProperInputColumns =
    app.serviceInputDefinition?.inputColumns?.every((inputColumn) => {
      const validColumns = (isNodeType ? nodeColumns : edgeColumns).filter(
        (c) => inputColumnFilterFn(c, inputColumn),
      )
      return validColumns.length > 0
    }) ?? true

  const serviceCanBeRun = networkHasProperInputColumns && numNetworks > 0

  const inputDefinition = inputTypeIsElement ? (
    <Box sx={{ p: 3 }}>
      <Box>
        <Typography sx={{ mb: 1, ml: -2 }}>Input Columns</Typography>
        <InputColumns {...props} />
      </Box>
    </Box>
  ) : null

  const parametersSection = app.parameters ? (
    <Box sx={{ p: 3 }}>
      <Typography sx={{ mb: 1, ml: -2 }}>Parameters</Typography>
      {app.parameters?.map((parameter: ServiceAppParameter) => (
        <Box key={parameter.displayName} style={{ marginBottom: '20px' }}>
          {renderParameter(parameter)}
        </Box>
      ))}
    </Box>
  ) : null

  const shouldAddMarginTop = !inputDefinition && !parametersSection

  const submitButton = !serviceCanBeRun ? (
    <Tooltip
      title={`Unable to run service.  The network doesn't have input columns that match the required data types from the service.`}
    >
      <Box
        display="flex"
        justifyContent="flex-end"
        sx={{
          marginTop: shouldAddMarginTop ? '20px' : 0,
        }}
      >
        <Button disabled>Submit</Button>
      </Box>
    </Tooltip>
  ) : (
    <Box
      display="flex"
      justifyContent="flex-end"
      sx={{
        marginTop: shouldAddMarginTop ? '20px' : 0,
      }}
    >
      <Button onClick={handleSubmit} color="primary" variant="contained">
        Submit
      </Button>
    </Box>
  )

  return (
    <Dialog
      maxWidth="sm"
      fullWidth
      open={open}
      onClose={handleClose}
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <Box sx={{ p: 3.5 }}>
        <Typography variant="h5">{app.name}</Typography>
        {inputDefinition}
        {parametersSection}
        {submitButton}
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
  existingMenuItems: Record<string, NestedMenuItem> = {},
): NestedMenuItem => {
  const { url } = app
  if (path.length === 0) {
    throw new Error('Menu path is empty')
  }

  const command = async (): Promise<void> => {
    await commandFn(url)
    console.log('## Task finished!')
  }

  // Case 1: Single menu item
  if (path.length === 1) {
    const item: MenuPathElement = path[0]
    const baseMenu: NestedMenuItem = existingMenuItems[item.name] || {
      label: item.name,
      items: [],
    }
    baseMenu.template = (
      <AppMenuItem handleConfirm={command} handleClose={() => {}} app={app} />
    )
    return baseMenu
  }

  // Case 2: Depth > 1
  const baseMenu: NestedMenuItem = existingMenuItems[path[0].name] || {
    label: path[0].name,
    items: [],
  }

  let currentMenuItem: NestedMenuItem = baseMenu
  for (let i = 1; i < path.length; i++) {
    const item: MenuPathElement = path[i]
    const newMenuItem: NestedMenuItem = existingMenuItems[item.name] || {
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
    currentMenuItem.items.push(newMenuItem as any)
    currentMenuItem = newMenuItem
  }
  return baseMenu
}

export const createMenuItems = (
  serviceApps: Record<string, ServiceApp>,
  commandFn: (url: string) => Promise<void>,
): NestedMenuItem[] => {
  const appIds: string[] = Object.keys(serviceApps)

  // Sort the appIds based on gravity of the top menu item
  const sortedAppIds = appIds.sort((a, b) => {
    const gravityA = serviceApps[a].cyWebMenuItem.path[0].gravity
    const gravityB = serviceApps[b].cyWebMenuItem.path[0].gravity
    return gravityA - gravityB
  })

  const appMenuItems: NestedMenuItem[] = []
  const existingMenuItems: Record<string, NestedMenuItem> = {}

  sortedAppIds.forEach((appId: string) => {
    const app: ServiceApp = serviceApps[appId]
    const { cyWebMenuItem } = app
    const { path } = cyWebMenuItem
    const baseMenu = path2menu(app, path, commandFn, existingMenuItems)
    existingMenuItems[baseMenu.label as string] = baseMenu
  })

  Object.values(existingMenuItems).forEach((menuItem) => {
    appMenuItems.push(menuItem)
  })

  return appMenuItems
}
