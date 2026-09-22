import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { CyDialog } from '@/components/CyDialog'
import { ToolbarMenuItem as NestedMenuItem } from '@/features/ToolBar/menuItemModel'
import React from 'react'

import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import {
  columnTypeMatchesFilter,
  inputColumnFilterFn,
  isAutoFilledParameter,
  shouldShowServiceDescription,
  validateParameter,
} from '../../../models/AppModel/impl'
import { MenuPathElement } from '../../../models/AppModel/MenuPathElement'
import { ParameterUiType } from '../../../models/AppModel/ParameterUiType'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { ServiceAppParameter } from '../../../models/AppModel/ServiceAppParameter'
import { IdType } from '../../../models/IdType'
import { getDomain } from '../../../utils/urlUtil'

/** Props of the parameter dialog. The host menu owns it, not the menu row. */
export interface AppMenuItemDialogProps {
  handleClose: () => void
  handleConfirm: () => Promise<void>
  app: ServiceApp
  open: boolean
}

interface AppMenuItemProps {
  /** Reports the picked app to the host menu, which opens the dialog. */
  onSelect: () => void
  app: ServiceApp
  showTooltip?: boolean
}

export const InputColumns = (props: AppMenuItemDialogProps) => {
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

  // Initialize column defaults once per dialog open (this component remounts
  // each time the dialog opens). Adding inputColumns/column deps would re-fire
  // after the effect's own store write — an update loop that also reverts the
  // user's dropdown selection back to the default.
  React.useEffect(() => {
    app.serviceInputDefinition?.inputColumns.forEach((inputColumn) => {
      const validColumns = (isNodeType ? nodeColumns : edgeColumns).filter(
        (c) => inputColumnFilterFn(c, inputColumn),
      )
      if (validColumns.length > 0) {
        updateInputColumn(app.url, inputColumn.name, validColumns[0].name)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init defaults once per dialog open
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

export const AppMenuItemDialog: React.FC<AppMenuItemDialogProps> = (props) => {
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

  const validationResults = React.useMemo(() => {
    const results: Record<string, boolean> = {}
    app.parameters?.forEach((p) => {
      results[p.displayName] = validateParameter(p)
    })
    return results
  }, [app.parameters])

  const renderParameter = (parameter: ServiceAppParameter) => {
    switch (parameter.type) {
      case ParameterUiType.Text: {
        const value = parameter.value ?? parameter.defaultValue ?? ''
        const isValid = validationResults[parameter.displayName] ?? true
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
                error={!isValid}
                helperText={!isValid ? parameter.validationHelp : ''}
                size="small"
                label={parameter.displayName}
                value={value}
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
      }
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
                    (parameter.value ?? parameter.defaultValue) === 'true'
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
                {nodeColumns
                  .filter((column) =>
                    columnTypeMatchesFilter(
                      column.type,
                      parameter.columnTypeFilter,
                    ),
                  )
                  .map((column, i) => (
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
                {edgeColumns
                  .filter((column) =>
                    columnTypeMatchesFilter(
                      column.type,
                      parameter.columnTypeFilter,
                    ),
                  )
                  .map((column, i) => (
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

  const allParametersValid = Object.values(validationResults).every((v) => v)

  if (!allParametersValid) {
    serviceCanBeRun = false
    submitTooltip = 'Please fix the validation errors in the parameters.'
  }

  const inputDefinition = inputTypeIsElement ? (
    <Box sx={{ p: 3 }}>
      <Box>
        <Typography sx={{ mb: 1, ml: -2 }}>Input Columns</Typography>
        <InputColumns {...props} />
      </Box>
    </Box>
  ) : null

  // Auto-filled parameters (ndexUUID, accessToken, ...) are resolved at run
  // time and never shown to the user.
  const visibleParameters =
    app.parameters?.filter(
      (parameter) => !isAutoFilledParameter(parameter.type),
    ) ?? []

  const parametersSection =
    visibleParameters.length > 0 ? (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ mb: 1, ml: -2 }}>Parameters</Typography>
        {visibleParameters.map((parameter: ServiceAppParameter) => (
          <Box key={parameter.displayName} style={{ marginBottom: '20px' }}>
            {renderParameter(parameter)}
          </Box>
        ))}
      </Box>
    ) : null

  const showDescription = shouldShowServiceDescription(
    app.description,
    app.showDescriptionInDialog,
  )

  const shouldAddMarginTop = !inputDefinition && !parametersSection

  return (
    <CyDialog maxWidth="sm" fullWidth open={open}>
      <Box sx={{ p: 3.5 }}>
        <Typography variant="h5">{app.name}</Typography>
        {showDescription ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, whiteSpace: 'pre-line' }}
          >
            {app.description}
          </Typography>
        ) : null}
        {inputDefinition}
        {parametersSection}
        {/* Cancel is the dialog's only exit: nothing dismisses on backdrop
            click or Escape (docs/specifications/DIALOG_DISMISS_POLICY.md). */}
        <Box
          display="flex"
          justifyContent="flex-end"
          gap={1}
          sx={{
            marginTop: shouldAddMarginTop ? '20px' : 0,
          }}
        >
          <Button
            data-testid="service-app-dialog-cancel-button"
            variant="outlined"
            onClick={handleClose}
          >
            Cancel
          </Button>
          {!serviceCanBeRun ? (
            <Tooltip title={submitTooltip}>
              {/* A disabled Button swallows the pointer events Tooltip listens
                  for, so the span carries them instead. */}
              <span>
                <Button disabled>Submit</Button>
              </span>
            </Tooltip>
          ) : (
            <Button onClick={handleSubmit} color="primary" variant="contained">
              Submit
            </Button>
          )}
        </Box>
      </Box>
    </CyDialog>
  )
}

/**
 * One service app as a row in a menu. The row reports the pick and nothing
 * else: the parameter dialog is rendered by the host menu (see
 * `useServiceAppMenu`), so closing the menu no longer unmounts the form.
 */
export const AppMenuItem: React.FC<AppMenuItemProps> = (props) => {
  const { onSelect, app, showTooltip } = props

  return (
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
      <MenuItem onClick={onSelect}>{app.name}</MenuItem>
    </Tooltip>
  )
}
const path2menu = (
  app: ServiceApp,
  path: MenuPathElement[],
  onSelectApp: (app: ServiceApp) => void,
  existingMenuItems: Record<string, NestedMenuItem> = {},
): NestedMenuItem => {
  if (path.length === 0) {
    throw new Error('Menu path is empty')
  }

  const onSelect = (): void => onSelectApp(app)

  // Case 1: Single menu item
  if (path.length === 1) {
    const item: MenuPathElement = path[0]
    const baseMenu: NestedMenuItem = existingMenuItems[item.name] || {
      label: item.name,
      items: [],
    }
    baseMenu.template = <AppMenuItem onSelect={onSelect} app={app} />
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
        <AppMenuItem onSelect={onSelect} app={app} />
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
          <AppMenuItem onSelect={onSelect} app={app} showTooltip={true} />
        )
        // add tooltip for the existing duplicated menu item
        existingDupMenuItems.forEach((item) => {
          // Ensure item.template is a valid ReactElement before modifying it
          if (item.template && React.isValidElement(item.template)) {
            const existing = item.template.props as AppMenuItemProps
            item.template = (
              <AppMenuItem
                onSelect={existing.onSelect}
                app={existing.app}
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
          !Object.prototype.hasOwnProperty.call(item, 'template') ||
          item.template === undefined,
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
  onSelectApp: (app: ServiceApp) => void,
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
    const baseMenu = path2menu(app, path, onSelectApp, existingMenuItems)
    existingMenuItems[baseMenu.label as string] = baseMenu
  })

  Object.values(existingMenuItems).forEach((menuItem) => {
    appMenuItems.push(menuItem)
  })

  return appMenuItems
}
