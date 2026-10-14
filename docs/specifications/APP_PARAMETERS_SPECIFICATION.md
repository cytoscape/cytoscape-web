# App Parameters Specification

> The one parameter spec Cytoscape Web uses to render user-editable
> parameters: for **service apps** (the `parameters` array a service endpoint
> returns), for **layout algorithms apps register** through the App API
> (`resource.registerLayout({ parameters })`), and for the **built-in layout
> algorithms** (`LayoutAlgorithm.editables`). One spec, one form:
> `src/features/ParameterForm/` renders all three.

Model: `src/models/AppModel/AppParameter.ts`. Helpers (key rule, typing,
validation, grouping): `src/models/AppModel/impl/parameters.ts`.

## A parameter

A list of parameter objects, **in the order the form should show them**.
There is no ordering or gravity field.

```jsonc
{
  "displayName": "Algorithm", // Label of the parameter; also its key (see "Keys")
  "description": "Choose to use Louvain or newer Leiden algorithm", // Tooltip or hint
  "type": "text", // Other values: "dropDown", "radio", "checkBox", "nodeColumn", "edgeColumn", "accessToken", "ndexUUID"
  "valueList": ["louvain", "leiden"], // Applicable when type = "dropDown" or "radio"
  "defaultValue": "louvain", // Default or selected value
  "validationType": "string|number|digits", // Only used for text fields
  "columnTypeFilter": "number|list|<cx2 type>", // Only for node or edge column type
  "validationHelp": "Must be set to louvain or leiden",
  "validationRegex": "louvain|leiden", // Only for text + string
  "minValue": null, // Applies to numeric text fields
  "maxValue": null, // Applies to numeric text fields
  "groups": ["Community", "Advanced"], // Presentation grouping, outermost first
}
```

Fields other than `displayName` and `type` are optional, and may be `null`
(service endpoints send `null` for what does not apply).

### `displayName`

Label of the parameter, shown next to its control. Required. It is also the
parameter's **key** (see "Keys").

### `description`

Tooltip or hint describing the parameter in more detail.

### `type`

The UI component to show:

- `text` — text box. `validationType`, `validationRegex`, `minValue`,
  `maxValue` and `validationHelp` apply.
- `dropDown` — dropdown with the values of `valueList`, `defaultValue`
  selected.
- `radio` — radio button group with the values of `valueList`,
  `defaultValue` selected, otherwise no selection.
- `checkBox` — checkbox, checked when `defaultValue` is `true`. Service apps
  send the result back as the strings `"true"` / `"false"`; a layout's
  `run` receives a boolean.
- `nodeColumn` — dropdown of the current network's node columns, limited by
  `columnTypeFilter`, `defaultValue` selected when possible.
- `edgeColumn` — the same over the network's edge columns.
- `accessToken` — **service apps only**, never shown: the host fills in the
  NDEx server URL and token so the service can act on the user's NDEx
  account. Only `displayName` needs to be set.
- `ndexUUID` — **service apps only**, never shown: the NDEx URL with the
  UUID of the current network, or empty.

Layouts registered by apps may not declare `accessToken` or `ndexUUID`
(`registerLayout` rejects them); a browser-side app already has the App API
and must not receive the user's token through a parameter.

### `valueList`

The values of a `dropDown` or `radio` parameter. Required for those two
types, ignored otherwise.

### `defaultValue`

The initial value; what it means depends on `type` (see above). For a
layout registered through the App API it is required and must be typed:
a number for `text` with `validationType` `number` / `digits`, a boolean for
`checkBox`, a string otherwise, and one of `valueList` for `dropDown` /
`radio`. Service apps send every default as a string and the host coerces.

### `validationType`

`text` only:

- `number` — floating point numbers (`24.5`, `12`, `-1234.23`). Bounded by
  `minValue` / `maxValue`.
- `digits` — whole numbers (`1`, `34`, `-10`). Bounded by `minValue` /
  `maxValue`.
- `string` — free text, constrained by `validationRegex` when given.

Absent or `null` means `string`.

### `columnTypeFilter`

`nodeColumn` / `edgeColumn` only; which columns to offer:

- any [CX2 data type](<https://cytoscape.org/cx/cx2/specification/cytoscape-exchange-format-specification-(version-2)/#attributedeclarations>)
  (`string`, `long`, `integer`, `double`, `boolean`, `list_of_*`)
- `number` — any numeric column (`long`, `integer`, `double`)
- `wholenumber` — `long` or `integer`
- `list` — any list column
- `list_of_number` — `list_of_long`, `list_of_integer` or `list_of_double`
- `list_of_wholenumber` — `list_of_long` or `list_of_integer`

A **list** of the above offers a column when any entry matches:
`["string", "long", "integer", "boolean"]` is "every column except doubles
and lists". Absent, `null`, empty, or an empty list offers every column.

### `validationHelp`

The message shown when validation fails. When absent, the host shows a
default ("Must be a whole number", "Must be at least 0", "Must match …",
"Must be one of: …").

### `validationRegex`

`text` + `string` only: the value must match this regular expression. A
pattern the host refuses to run (longer than 1000 characters, or unsafe
under catastrophic backtracking) fails validation; a pattern with a syntax
error is ignored.

### `minValue` / `maxValue`

`text` + `number` / `digits` only: the smallest / largest allowed value.
`null` means no bound.

### `groups`

Presentation grouping, like Cytoscape Desktop's `@Tunable(groups = {...})`:
an array of group names from the outermost group down. A parameter with no
groups belongs to the top level.

```jsonc
[
  {
    "displayName": "Last name",
    "type": "text",
    "groups": ["Company", "Department", "Office"],
  },
  {
    "displayName": "First name",
    "type": "text",
    "groups": ["Company", "Department", "Office", "Identity"],
  },
  {
    "displayName": "Office name",
    "type": "text",
    "groups": ["Company", "Department", "Office"],
  },
]
```

renders Company ⟶ Department ⟶ Office as nested fieldsets; inside Office:
_Last name_, then the _Identity_ fieldset with _First name_, then _Office
name_. Rules:

- Each group is a `<fieldset>` with its name as the legend.
- Groups and fields appear, at each level, in the order they are **first
  seen** in the array. A group's fields therefore stay together even when
  the array interleaves them with other groups' fields (the array order
  still decides the order within a group).

## Keys

Consumers read values by key: a layout's `run` gets
`context.parameters[key]`, a service receives `parameters[key]` in its
request, and edits are stored under the key.

- A parameter's key is its `displayName`.
- When two or more parameters in one list share a `displayName`, each of
  those is keyed by its **group path and display name joined with `/`**
  instead (`Company/Department/Office/Identity/Name`), so same-label
  parameters in different groups stay distinct. Parameters with a unique
  label keep the plain `displayName`.
- Two parameters with the same `displayName` **and** the same `groups` are
  an error: `registerLayout` rejects the registration; a service payload is
  accepted with a warning and the last one wins.

Implementation: `parameterKeys` / `duplicateParameterKeys` in
`src/models/AppModel/impl/parameters.ts`.

## Values

- **Service apps** send and receive strings for every parameter, as the
  protocol always has (`"true"`, `"10"`). The form coerces for display.
- **Layouts** (built-in and app-registered) hold values typed by the
  declaration (`coerceParameterValue`): `checkBox` → boolean; `text` with
  `validationType` `number` → number, `digits` → integer; everything else
  (free text, `dropDown`, `radio`, column pickers) → string. That is what
  `run` receives and what the built-in engines already need.

## Validation

`validateParameterValue` returns the message to show, or nothing:

| type                | checked                                                     |
| ------------------- | ----------------------------------------------------------- |
| `text` + `string`   | `validationRegex`                                           |
| `text` + `number`   | parses as a number; `minValue` / `maxValue`                 |
| `text` + `digits`   | parses as a whole number; `minValue` / `maxValue`           |
| `dropDown`, `radio` | value is one of `valueList` (when the list is non-empty)    |
| column pickers      | value is a column of the current network (form-level check) |
| others              | never fail                                                  |

The form shows the message under the field and the dialog disables its
Apply / Submit button while any stored value fails. A `text` field keeps a
local draft and only stores a value that validates, so a half-typed number
never reaches a stored value that other paths (Apply Default Layout,
`layout.applyLayout`) run without a dialog.

## Definition validation

`parameterDefinitionProblem(param, index, { strict })`:

- Structural rules, every consumer: `displayName` non-empty and not
  `__proto__` (it becomes a key of plain value records); `type` known;
  `valueList` a non-empty string array for `dropDown` / `radio`; `groups`
  an array of non-empty strings; `validationType` known; `validationRegex`
  a string; `minValue <= maxValue`.
- `strict` (App API layouts): `defaultValue` present and typed, in
  `valueList` for `dropDown` / `radio`; no `accessToken` / `ndexUUID`.

Service metadata is parsed leniently (`parseServiceMetadata`): structural
problems are logged, never rejected, so a service that works today keeps
working.

## Where it is consumed

| Consumer              | Definitions                                                                            | Values                                                                | Renderer                               |
| --------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| Service app           | `ServiceApp.parameters` (`ServiceAppParameter[]`)                                      | `parameter.value` (string), `updateServiceParameter(url, key, value)` | `AppMenuItemDialog` → `ParameterForm`  |
| App-registered layout | `RegisterLayoutOptions.parameters` (`LayoutParameter[]`) → `LayoutAlgorithm.editables` | `LayoutAlgorithm.parameters[name]`, `setLayoutOption`                 | `LayoutOptionDialog` → `ParameterForm` |
| Built-in layout       | `LayoutAlgorithm.editables` (`EditableParameter[]`, `name` = engine option)            | `LayoutAlgorithm.parameters[name]`, `setLayoutOption`                 | `LayoutOptionDialog` → `ParameterForm` |
