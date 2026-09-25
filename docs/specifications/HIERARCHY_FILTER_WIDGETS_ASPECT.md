# Hierarchy Viewer `filterWidgets` Aspect

## Overview

The Hierarchy Viewer builds the filter panel of a subsystem's interaction
network from the `filterWidgets` opaque aspect of that network's CX2 document.
The format has no published specification (the
[HCX specification](https://cytoscape.org/cx/cx2/hcx-specification/) does not
mention it). This document describes what Cytoscape Web accepts.

- Type: `FilterAspect` in `src/features/HierarchyViewer/model/FilterAspects.ts`
- Validation: `parseFilterAspects` in
  `src/features/HierarchyViewer/model/impl/filterAspectsSchema.ts`
- Consumer: `createFilterFromAspect` in
  `src/features/HierarchyViewer/utils/getFilterAspect.ts`, called from
  `SubNetworkPanel.tsx`

## Format

The aspect is an array of filter widget entries:

```json
{
  "filterWidgets": [
    {
      "widgetType": "checkboxes",
      "label": "Interaction source",
      "filterMode": "edge",
      "appliesTo": "edges",
      "attributeName": "interaction",
      "mappingSource": "EDGE_LINE_COLOR",
      "filter": [
        {
          "predicate": "IS",
          "criterion": "MuSIC_top1p",
          "description": "Integrated interaction"
        }
      ]
    }
  ]
}
```

A real example is
`test/fixtures/ndex/d3030388-dcb7-11ee-867c-005056aecf54.valid.filters.cx2`
(MuSIC interaction network).

### Entry fields

| Field           | Required | Accepted values                                                 | Default         |
| --------------- | -------- | --------------------------------------------------------------- | --------------- |
| `appliesTo`     | yes      | `node`, `nodes`, `edge`, `edges`                                | —               |
| `attributeName` | yes      | non-empty string except `__proto__`, `constructor`, `prototype` | —               |
| `filter`        | yes      | array of filter items (below), may be empty                     | —               |
| `widgetType`    | no       | `checkbox`, `checkboxes`                                        | `checkbox`      |
| `filterMode`    | no       | `node`, `nodes`, `edge`, `edges`                                | `appliesTo`     |
| `label`         | no       | string                                                          | `attributeName` |
| `mappingSource` | no       | string                                                          | `''`            |

`appliesTo`, `filterMode` and `widgetType` are matched case-insensitively and
normalized to `GraphObjectType` (`node` / `edge`) and `FilterWidgetType.CHECKBOX`.
`appliesTo` selects the table whose values populate the checkboxes and the
elements whose visibility the filter controls. Checkboxes are the only widget
built from this aspect, so other widget types are rejected.

### Filter item fields

| Field         | Required | Type   | Default     |
| ------------- | -------- | ------ | ----------- |
| `predicate`   | yes      | string | —           |
| `criterion`   | yes      | string | —           |
| `description` | no       | string | `criterion` |
| `tooltip`     | no       | string | `''`        |

A filter item labels one checkbox: the checkbox for the value `criterion` is
shown as `description`. The checkbox values themselves come from the
`attributeName` column of the target table.

## Validation behavior

The aspect is external input (see `EXTERNAL_INPUT_VALIDATION_POLICY.md`), so
it is validated before use. A bad filter must never take down the subnetwork
view it belongs to:

- A value that is not an array produces no filters.
- An entry that fails validation is dropped; the other entries are kept.
- Each case logs a `logApi.warn` naming the entry index and the failing
  fields.
- Unknown keys are dropped. Parsed entries contain only the fields above, so
  `__proto__` or `constructor` keys in the input never reach the app.
