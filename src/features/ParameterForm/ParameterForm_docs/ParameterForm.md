# ParameterForm Feature

## Overview

`ParameterForm` renders one parameter list — the shared `AppParameter` spec
(`src/models/AppModel/AppParameter.ts`, contract in
`docs/specifications/APP_PARAMETERS_SPECIFICATION.md`) — as a form. The same
component serves three consumers:

- the Layout Settings dialog, for built-in layout algorithms
  (`LayoutAlgorithm.editables`);
- the Layout Settings dialog, for algorithms apps register through the App
  API (`resource.registerLayout`);
- the service-app dialog (`features/ToolBar/AppMenu/MenuFactory.tsx`), for
  the parameters a service endpoint declares.

## Architecture

- `ParameterForm.tsx` — the container. Computes the keys (`parameterKeys`, or
  the caller's `keys`), builds the presentation tree (`groupParameters`),
  and renders it: fields in array order, each group a `<fieldset>` with its
  name as the `<legend>`, nested groups inside, host-filled types
  (`ndexUUID`, `accessToken`) hidden.
- `ParameterField.tsx` — one control per `ParameterUiType`: `text`
  (`TextField`), `dropDown` (`Select`), `radio` (`RadioGroup`), `checkBox`
  (`Checkbox`), `nodeColumn` / `edgeColumn` (`Select` over the network's
  columns filtered by `columnTypeFilter`). Every row shows `displayName` as
  the label and `description` as a tooltip.
- `parameterErrors.ts` — `computeParameterErrors` (pure) and
  `useParameterErrors` (hook): the validation map a dialog uses to disable
  its Apply / Submit button. Host-filled types are skipped; a column value
  that is not in the current network's table is reported.
- `useNetworkColumns.ts` — node and edge columns of one network from
  `TableStore` (edge columns from the edge table).
- Pure helpers live in `src/models/AppModel/impl/parameters.ts`: the key
  rule, value typing and coercion, value validation, grouping, definition
  validation.

## Behavior

### Keys

A parameter's key is its `displayName`. When two parameters in the list
share a `displayName`, each colliding one is keyed by its group path joined
with `/` (`Group/Subgroup/Name`) instead. `onChange` reports the key;
`values` is read by key. The Layout Settings dialog overrides the keys with
the editables' `name` (the engine's option name), because built-in
algorithms store their values under those.

### Values and typing

`onChange` delivers a value typed by the declaration
(`coerceParameterValue`): `checkBox` → boolean; `text` with
`validationType: 'number'` → number, `'digits'` → integer; everything else →
string. Consumers that store strings (service apps) call `String(value)`.
`values` may hold strings or typed values; the form coerces for display, so
a service-app `'true'` renders as a checked box.

### Draft-and-commit for text fields

A `text` field keeps a local draft and calls `onChange` only when the draft
validates (`validateParameterValue`: number / whole-number parsing,
`minValue` / `maxValue`, `validationRegex`, or `valueList` membership for
choices). The message (`validationHelp` or a default) shows under the field
meanwhile. This keeps a half-typed number out of the stored value, which
other paths (Apply Default Layout, `layout.applyLayout`) run without a
dialog to gate them. The draft resyncs when the stored value changes from
outside (another algorithm selected, a reset).

### Groups

`groups: ['Company', 'Department']` nests a parameter under Company →
Department. Groups and fields appear at each level in the order they were
first seen in the array, so the fields of one group stay together even when
the array interleaves them. Group fieldsets are never `disabled` as
elements (a disabled fieldset silently disables every descendant without
MUI reflecting it); `disabled` is applied per control.

### Column pickers

`nodeColumn` / `edgeColumn` list the network's columns filtered by
`columnTypeFilter` (`columnTypeMatchesFilter`), sorted alphabetically and
case-insensitively. "(none)" is offered as a choice and shown when no column
is selected, since "no column" is a valid answer (the value is `''`). A stored value that is not a
column of the current network still renders, marked "(not in this
network)", so MUI never sees an out-of-range value, and it is reported as an
error; the same for a `dropDown` value that is no longer in `valueList`.

## Test ids

- `${testIdPrefix}-form` on the container.
- `${testIdPrefix}-field-${key}` on the control: the `<input>` for `text`
  and `checkBox` (so Playwright can `fill()` / `click()` it), the display
  element of a `Select` for `dropDown` / column pickers, the `RadioGroup`
  for `radio`.
- `${testIdPrefix}-group-${path}` on each fieldset (`path` = group names
  joined with `/`).

Prefixes in use: `layout-parameter` (Layout Settings), `service-app-parameter`
(service-app dialog).

## Design Decisions

- **One spec, one form.** Layout parameters and service-app parameters were
  two shapes with two renderers; the spec Christian wrote for service apps
  became the shared one (issue #734 follow-up), with `groups` added from
  Cytoscape Desktop's `@Tunable(groups=...)`.
- **Order by array, not gravity.** Fields render in declaration order; there
  is no ordering key to coordinate across apps.
- **Definitions are immutable.** Editables never change; only the value
  record does. That is what makes the form reusable across consumers with
  different stores.
