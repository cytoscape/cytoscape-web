import { MenuItem as NestedMenuItem } from 'primereact/menuitem'
import { MenuPathElement } from '../../../models/AppModel/MenuPathElement'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  FormControlLabel,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
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
import { getDomain } from '../../../utils/url-util'
import React from 'react'

interface AppMenuItemProps {
  handleClose: () => void
  handleConfirm: () => Promise<void>
  app: ServiceApp
  open: boolean
  showTooltip?: boolean
}

export const InputColumns = (props: AppMenuItemProps) => {
  const { app } = props
  const isNodeType = app.serviceInputDefinition?.type === 'node'

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
  const serviceInputDefinition = app.serviceInputDefinition
  const isNodeType = serviceInputDefinition?.type === 'node'
  const isEdgeType = serviceInputDefinition?.type === 'edge'
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
    serviceInputDefinition?.inputColumns?.every((inputColumn) => {
      const validColumns = (isNodeType ? nodeColumns : edgeColumns).filter(
        (c) => inputColumnFilterFn(c, inputColumn),
      )
      return validColumns.length > 0
    }) ?? true

  let serviceCanBeRun = true
  let submitTooltip = ''
  if ((serviceInputDefinition?.inputColumns?.length ?? 0) > 0) {
    serviceCanBeRun =
      serviceCanBeRun && numNetworks > 0 && networkHasProperInputColumns
    submitTooltip =
      "Unable to run service.  The network doesn't have input columns that match the required data types from the service."
  }

  if (serviceInputDefinition?.inputNetwork) {
    serviceCanBeRun = serviceCanBeRun && numNetworks > 0
    submitTooltip = "Unable to run service. There isn't an active network."
  }

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
    <Tooltip title={submitTooltip}>
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
      e.stopPropagation();
    }}
    onClick={(e) => {
      e.stopPropagation();
    }}
  >
    <Box sx={{ p: 3.5 }}>
      <Stack spacing={1.5}>
        <Typography variant="h5">
          {app.name}
        </Typography>

        <Typography variant="body1">
  {app.showDescriptionInDialog ? (app.description || "No description available.") : null}
</Typography>

        {inputDefinition}

        {/* ↓↓↓ MODIFIED parametersSection rendering below ↓↓↓ */}
        {app.parameters && (
  <Box sx={{ p: 3 }}>
    {/* Hide "parameters" header */}
    {app.parameters.map((parameter: ServiceAppParameter) => {
      const isSpecialCheckbox =
        app.name === "NetworkX Analyzer";

      return (
        <Box key={parameter.displayName} sx={{ mb: 2 }}>
          {isSpecialCheckbox ? (
            // ✅ Use your app’s logic but change layout
            
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                <Box sx={{ whiteSpace: 'nowrap' }}>
                  {renderParameter(parameter)}
                </Box>
              </Box>
            
          ) : (
            renderParameter(parameter)
          )}
        </Box>
      );
    })}
  </Box>
)}
        {/* ↑↑↑ END parametersSection override ↑↑↑ */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 3 }}>
  {app.name === "NetworkX Analyzer" ? (
    <Typography variant="body2">
      <Link
        href="https://github.com/cytoscape/web-cytoscape-manual/blob/main/docs/analyze.md"
        target="_blank"
        rel="noopener"
      >
        Learn more in the Cytoscape Web Manual.
      </Link>
    </Typography>
  ) : (
    <Box /> // empty box to maintain alignment if no link is needed
  )}

  {submitButton}
</Box>
    </Stack>  
    </Box>
  </Dialog>
);
}

export const AppMenuItem: React.FC<{
  handleClose: () => void
  handleConfirm: () => Promise<void>
  app: ServiceApp
  showTooltip?: boolean
}> = (props: AppMenuItemProps) => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const { handleClose, app, showTooltip } = props
  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    handleClose() // Call handleClose from props if needed
  }

  return (
    <>
      <Tooltip
        title={
          showTooltip ? (
            <Box sx={{ maxWidth: '220px' }}>
              <div>
                <strong>Hosted at: </strong>
                {getDomain(app.url)}
              </div>
              <div>
                <strong>Version: </strong>
                {app.version}
              </div>
              <div>
                <strong>Author: </strong>
                {app.author}
              </div>
            </Box>
          ) : (
            ''
          )
        }
        arrow
        placement="right"
      >
        <MenuItem onClick={() => handleOpenDialog()}>{app.name}</MenuItem>
      </Tooltip>
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
    const itemName = path[i].name
    const isLastItem = i === path.length - 1

    const newMenuItem: NestedMenuItem = {
      label: itemName,
      items: [],
      template: isLastItem ? (
        <AppMenuItem handleClose={() => {}} app={app} handleConfirm={command} />
      ) : undefined,
    }
    if (currentMenuItem.items === undefined) {
      currentMenuItem.items = []
    }
    const existingDupMenuItems = currentMenuItem.items.filter(
      (item) => (item as any).label === itemName,
    ) as NestedMenuItem[]

    const isNameDuplicated = existingDupMenuItems.length > 0
    if (isNameDuplicated) {
      if (isLastItem) {
        // add tooltip for the menu item to be added
        newMenuItem.template = (
          <AppMenuItem
            handleClose={() => {}}
            app={app}
            handleConfirm={command}
            showTooltip={true}
          />
        )
        // add tooltip for the existing duplicated menu item
        existingDupMenuItems.forEach((item) => {
          // Ensure item.template is a valid ReactElement before modifying it
          if (item.template && React.isValidElement(item.template)) {
            const { app, handleConfirm } = item.template
              .props as AppMenuItemProps
            item.template = (
              <AppMenuItem
                handleClose={() => {}}
                app={app}
                handleConfirm={handleConfirm}
                showTooltip={true}
              />
            )
          }
        })
        currentMenuItem.items.push(newMenuItem as any)
        break
      }
      // Find the duplicated menu item (which is not the last item in original path)
      // and follow that path
      const intermediateItem = existingDupMenuItems.filter(
        (item) =>
          !item.hasOwnProperty('template') || item.template === undefined,
      ) as NestedMenuItem[]

      if (intermediateItem.length > 0) {
        currentMenuItem = intermediateItem[0]
        continue
      }
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
