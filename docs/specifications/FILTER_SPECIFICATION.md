# FILTER Tab Specification

## Overview

The FILTER tab of the left panel (after STYLE) is a port of the "Filter" tab
of Cytoscape Desktop's Filter panel. A filter is a tree of conditions that
either **selects** the nodes and edges that pass it or **shows** only them.
Filters are read from and written to Cytoscape Desktop's filter files, so a
filter moves between the two applications.

Cytoscape Desktop's "Chain" tab is not ported.

| Part                       | Location                                        |
| -------------------------- | ----------------------------------------------- |
| Types                      | `src/models/FilterModel/FilterTree.ts`          |
| Building and editing trees | `src/models/FilterModel/impl/filterTreeImpl.ts` |
| Comparisons                | `src/models/FilterModel/impl/predicates.ts`     |
| Evaluation                 | `src/models/FilterModel/impl/evaluateFilter.ts` |
| Validation warnings        | `src/models/FilterModel/impl/validateFilter.ts` |
| File format                | `src/models/FilterModel/impl/cyFilterJson.ts`   |
| Test fixtures              | `test/fixtures/filters/`                        |

The evaluation code and the file parser are not exported from the
`FilterModel` barrel: import them from their files, so they stay out of the
startup bundle.

## Scope

- Filters of the FILTER tab (`WorkspaceFilter`) belong to the **workspace**,
  as in Cytoscape Desktop, where they belong to the session. They are not tied
  to a network: the tab applies the selected filter to the network it targets
  (the active network view, else the current network).
- The Hierarchy Viewer's subnetwork filter, built from the `filterWidgets` CX2
  aspect (`HIERARCHY_FILTER_WIDGETS_ASPECT.md`), stays separate. It keeps its
  own `FilterConfig` and is never listed in the FILTER tab. The two meet in
  one place only: applying a workspace filter to a subnetwork that has a
  `filterWidgets` filter switches that filter off, in select mode as well as
  in show mode. Switching the `filterWidgets` filter on again changes nothing
  in the FILTER tab.

## Filter tree

A filter (`NamedFilter`) is a name and a root group. A `WorkspaceFilter` adds
its display mode (`DisplayMode.SELECT` or `DisplayMode.SHOW_HIDE`), which is
CW state and never written to files.

Conditions are identified by Cytoscape Desktop's transformer ids:

| Condition | Id                              | Applies to     |
| --------- | ------------------------------- | -------------- |
| Group     | `org.cytoscape.CompositeFilter` | its conditions |
| Column    | `org.cytoscape.ColumnFilter`    | its target     |
| Degree    | `org.cytoscape.DegreeFilter`    | nodes          |
| Topology  | `org.cytoscape.TopologyFilter`  | nodes          |

A condition is found by its **path**: the child indexes from the root; the
root is `[]`.

## Evaluation

The rules below match Cytoscape Desktop (`filter2-impl`), and its unit tests
are ported as `evaluateFilter.test.ts`. Differences are listed at the end.

### Group

- `ALL` (match all, AND) or `ANY` (match any, OR), short-circuiting.
- An **empty group accepts every element**.

### Column condition

Fields: `columnName`, `target` (`nodes`, `edges` or `nodes+edges`),
`predicate`, `criterion`, `caseSensitive`, `anyMatch`.

- An unset column, predicate or criterion rejects every element.
- An element of the wrong kind for the target is rejected. `nodes+edges`
  reads the node table for nodes and the edge table for edges, so it needs a
  column of that name in both.
- A column missing from the table rejects every element.
- The column's declared type decides the comparison:
  - **String** (and `list_of_string`): the text predicates.
  - **Integer, Long, Double** (and their lists): the numeric predicates. The
    criterion is a number `n`, read as the range `[n, n]`, or a range
    `[lower, upper]`.
  - **Boolean**: the cell equals the criterion. The predicate is ignored, so
    `IS_NOT false` matches `false`.
- **Lists**: with `anyMatch`, any element must pass; otherwise every element
  must. A missing list fails; an empty list fails "any" and passes "every".
  A `list_of_boolean` passes when any element equals the criterion, whatever
  `anyMatch` says.

#### Predicates

The single-value numeric predicates compare against the lower bound. Numbers
compare like Java's `Double.compare` (NaN is above every number).

| Predicate          | Missing value | Otherwise                               |
| ------------------ | ------------- | --------------------------------------- |
| `IS` (number)      | false         | `value == lower`                        |
| `IS_NOT` (number)  | **false**     | `value != lower`                        |
| `GREATER_THAN` ... | false         | compared with `lower`                   |
| `BETWEEN`          | false         | `lower <= value <= upper`               |
| `IS_NOT_BETWEEN`   | **true**      | not `BETWEEN` (NaN included)            |
| `IS` (text)        | false         | equal                                   |
| `IS_NOT` (text)    | **true**      | not equal                               |
| `CONTAINS`         | false         | substring                               |
| `DOES_NOT_CONTAIN` | **true**      | not a substring                         |
| `REGEX`            | false         | the pattern matches the **whole** value |

- Text comparisons ignore case unless `caseSensitive`. Cytoscape Desktop's UI
  always sets `caseSensitive` to false; files may still carry `true`, and CW
  honors it.
- A text predicate on a numeric column, or a numeric one on a text column,
  rejects every element.
- `REGEX` is compiled as `^(?:pattern)$` with the `i` flag unless
  case-sensitive. Patterns longer than 1000 characters, and Java-only syntax
  JavaScript cannot compile (possessive quantifiers, `\p{Alpha}`, ...), make
  the condition reject every element and produce a validation warning.

### Degree condition

Fields: `edgeType` (`ANY` "In + Out", `INCOMING` "In", `OUTGOING` "Out"),
`predicate` (the UI offers `BETWEEN` and `IS_NOT_BETWEEN`), `criterion`
(a range).

- Nodes only. A null criterion accepts every node.
- CW edges carry no directed flag, so every edge counts as directed from its
  source to its target. A self-loop counts once for `ANY` and once each for
  `INCOMING` and `OUTGOING`.

### Topology condition

Fields: `predicate` (the UI offers `GREATER_THAN_OR_EQUAL` "at least" and
`LESS_THAN` "less than"), `threshold`, `distance`, `matchType` and child
conditions (the neighbour conditions).

- Nodes only. A null distance or threshold rejects every node.
- Counts the distinct nodes within `distance` hops, ignoring edge direction
  and excluding the start node, that pass the neighbour conditions. Nodes on
  the way need not pass. With no neighbour condition every neighbour counts;
  with conditions that can never pass (`isAlwaysFalse`) none does.
- The count is compared with the threshold.

### Applies to

`appliesTo(condition, kind)` tells whether a condition is about nodes, edges
or both: by target for a column condition, nodes for degree and topology
conditions, and any child for a group (an empty group: neither).

### Running a filter

`evaluateFilter(context, root, displayMode)`:

- A filter whose root has no condition returns `undefined`: applying it does
  nothing.
- `SELECT` returns the nodes and edges that pass. The selection is
  **replaced** by them, so a node-only filter deselects every edge.
- `SHOW_HIDE` returns the elements to keep visible: those that pass, plus
  every element of a kind the filter is not about. A node filter keeps every
  edge; an edge whose node is hidden is not drawn anyway.

A `FilterContext` holds the caches of one run. Make a new one per run.

## Storage

Workspace filters live in `FilterStore.workspaceFilters`, keyed by a stable
id (a rename does not change it), next to the subnetwork `filterConfigs`.

| Action                          | Behavior                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `createWorkspaceFilter`         | New empty filter; a blank name becomes "Default filter", a taken one is numbered |
| `addWorkspaceFilters`           | Imported filters, under new ids and free names; never replaces                   |
| `renameWorkspaceFilter`         | Refused when blank or taken (ignoring case)                                      |
| `copyWorkspaceFilter`           | Same conditions, numbered name ("X 2")                                           |
| `deleteWorkspaceFilter`         | Removes the filter and its row                                                   |
| `setWorkspaceFilterRoot`        | Replaces the conditions                                                          |
| `setWorkspaceFilterDisplayMode` | Select or show                                                                   |

- They persist to the `workspaceFilters` IndexedDB table (DB v13), one row
  per filter: `{ id, displayMode, filter }`, where `filter` is the filter as
  an entry of a Cytoscape Desktop filter file. Rows are read back through the
  file parser, so a stored row gets the same limits and whitelist as an
  imported file; a malformed row is dropped with a warning.
- Writes go through the 300 ms persistence coalescer, so a burst of edits
  (typing a criterion) writes once. Deleting a filter cancels its pending
  write.
- Changes reach other tabs through cross-tab sync (`workspaceFilters` is a
  workspace-wide table). Changes applied from another tab are not written
  back.
- Deleting networks, even all of them, keeps workspace filters. Resetting the
  workspace or loading a remote workspace deletes the database, and with it
  the filters.

## Applying (FILTER tab)

`applyWorkspaceFilter(networkId, filterId)` in
`src/data/filter/applyWorkspaceFilter.ts` applies a filter in its display
mode. It uses no React and returns a result instead of throwing (counts and
elapsed time, or `filter-not-found`, `network-not-found`,
`style-not-found`), so a future filter App API can wrap it.

- **Select** replaces the network's selection with the elements that pass.
- **Show** rewrites the network's node and edge visibility bypasses: hidden
  (`none`) for the elements that fail, no bypass for the others. Elements
  hidden before, by any bypass, are shown again if they pass, as in Cytoscape
  Desktop. The bypasses belong to the network's active visual style and are
  saved with it, like any bypass. The selection is left alone.
- A filter without conditions changes nothing.
- Applying a filter creates no undo entry, as in Cytoscape Desktop.

**One applied filter per network.** `FilterStore.appliedWorkspaceFilters`
records the filter last applied to each network and its mode (in memory
only). Applying a select filter where a show filter was applied first shows
every element again (Cytoscape Desktop's "show all" when switching from show
to select). `setWorkspaceFilterDisplayModeAndApply` changes a filter's mode
and applies it at once, as Cytoscape Desktop's select/show radio buttons do.

**The subnetwork's `filterWidgets` filter.** Applying a workspace filter (with
conditions) to a subnetwork switches its `filterWidgets` filter off, in either
mode, and removes that filter's visibility bypass. While a workspace filter in
show mode is applied, the switched-off filter leaves the visibility alone.
Switching it back on calls `releaseWorkspaceFilter`: the workspace filter's
visibility bypasses are removed (show mode only) and its record dropped, then
the `filterWidgets` filter applies its own. No workspace filter is changed.

## FILTER tab

The tab (`src/features/Filter/`, see `Filter_docs/Filter.md`) follows
Cytoscape Desktop's Filter tab:

- A filter picker (sorted by name) and an options menu: New filter, Rename,
  Copy, Remove (with confirmation; not the last filter), Export filters,
  Import filters. A new filter is suggested "My filter"; a rename to a taken
  name is refused. There is always a filter ("Default filter").
- The conditions of the filter, with "Match all (AND)" / "Match any (OR)" once
  there are two, and a "+" menu: Column filter, Degree filter, Topology
  filter, Group. Nested groups always show how they combine.
- A column condition lists the node columns, then the edge columns ("Node:
  name", "Edge: weight"); its comparison follows the column type: text
  predicates and a text field, "is / is not" a range (slider plus fields) for
  numbers, or `is true / false`. List columns add "any element / every
  element". Picking a column sets Cytoscape Desktop's defaults
  (`columnFilterFor`).
- Numbers get only `BETWEEN` ("is") and `IS_NOT_BETWEEN` ("is not"), as in
  Cytoscape Desktop, whose Filter panel can neither create nor show the other
  numeric predicates (it reads a single-number criterion as a range and
  fails). Those predicates still come from filter files and Cytoscape Desktop
  commands: such a condition is shown as it is, its predicate listed after
  "is / is not" with a single number field. Switching it to "is" / "is not"
  turns it into the nearest inclusive range: "at least n" becomes
  `[n, max]`, "at most n" `[min, n]`, "equal to n" `[n, n]`.
- "Apply when filter changes" (default on below 100,000 nodes and edges),
  select / show, Apply, and a status line ("Selected 2 nodes and 0 edges in
  3 ms", or "Showing ..." in show mode).
- Export writes every workspace filter to `cytoscape-filters.json`. Import
  adds the filters of a file under free names and reports what it skipped.

The tab is `'filter'` in the App API's left pane (`panel.open('left',
'filter')`); LLM QUERY moved to position 3.

## File format

A filter file is what Cytoscape Desktop writes with Filter › Options ›
Export filters. There is no version field and no required extension
(`.json` is customary).

```json
[
  {
    "name": "Hubs",
    "transformers": [
      {
        "id": "org.cytoscape.CompositeFilter",
        "parameters": { "type": "ALL" },
        "transformers": [
          {
            "id": "org.cytoscape.ColumnFilter",
            "parameters": {
              "predicate": "BETWEEN",
              "criterion": [0.5, 2.75],
              "caseSensitive": false,
              "type": "nodes",
              "anyMatch": true,
              "columnName": "score"
            }
          },
          {
            "id": "org.cytoscape.DegreeFilter",
            "parameters": {
              "predicate": "BETWEEN",
              "criterion": [3, 12],
              "edgeType": "ANY"
            }
          },
          {
            "id": "org.cytoscape.TopologyFilter",
            "parameters": {
              "predicate": "GREATER_THAN_OR_EQUAL",
              "distance": 2,
              "threshold": 3,
              "type": "ALL"
            },
            "transformers": []
          }
        ]
      }
    ]
  }
]
```

### Parameters

| Condition | Parameters (default)                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Group     | `type`: `ALL` \| `ANY` (`ALL`)                                                                                                                                 |
| Column    | `predicate` (null), `criterion` (null), `caseSensitive` (false), `type`: `nodes` \| `edges` \| `nodes+edges` (`nodes`), `anyMatch` (true), `columnName` (null) |
| Degree    | `predicate` (`BETWEEN`), `criterion` (null), `edgeType`: `ANY` \| `INCOMING` \| `OUTGOING` (`ANY`)                                                             |
| Topology  | `predicate` (`GREATER_THAN_OR_EQUAL`), `distance` (null), `threshold` (null), `type`: `ALL` \| `ANY` (`ALL`)                                                   |

- A range is a two-number `criterion` array, `[lower, upper]`. A single number
  `n` means `[n, n]`.
- Groups and topology conditions carry their conditions in `transformers`.

### Writing

`serializeCyFilters` writes one entry per filter, holding its root group, as
Cytoscape Desktop's Filter tab exports. Cytoscape Desktop's reader requires
this key order, which the writer keeps:

- entry: `name`, then `transformers`;
- condition: `id`, then `parameters`, then `transformers` (always written for
  groups and topology conditions, even when empty).

The display mode is not written.

### Reading

`parseCyFilterText` reads a file; it never throws.

- **Limits**: at most 5,000,000 characters, conditions nested at most 32
  deep, and at most 10,000 conditions in the file. Past a limit the whole
  file is rejected. Nesting is checked without recursion before anything else
  is parsed.
- A top level that is not an array rejects the file.
- Each entry is read on its own. An entry that cannot be read is **skipped**
  with a reason, and the others are kept:
  - `chain`: only Chain transformers (`org.cytoscape.AdjacencyTransformer`,
    `org.cytoscape.InteractionTransformer`). Chain transformers next to
    filters in one entry are dropped.
  - `unknown-id`: a condition type CW does not know, at any depth (for
    example one from a Cytoscape app), or a chain transformer inside a filter.
  - `invalid`: no non-empty `name`, no `transformers` array, or a parameter of
    the wrong type (an unknown enum value, a non-integer distance, ...).
  - `no-filter`: no transformer at all.
- A short id without a dot gets the `org.cytoscape.` prefix
  (`ColumnFilter`).
- Missing `parameters` or parameters take their defaults; unknown parameters
  are dropped. Enum values are case-sensitive.
- A column criterion that is a list but not a range sets no criterion.
- A topology condition without `transformers` (Cytoscape 3.2 and earlier) has
  no neighbour condition.
- An entry holding a single group becomes that group; otherwise its
  conditions go into a new `ALL` group.
- Names are trimmed. A name repeated in the file gets a number ("Name 2",
  compared ignoring case). Clashes with existing filters are resolved by the
  importer.

### Untrusted input

Filter files come from anywhere:

- Parameters are read against a whitelist per condition type, so keys such as
  `__proto__` and `constructor` never reach the model.
- Row values are read with `Object.hasOwn`, so a column named like an
  `Object.prototype` member reads nothing.
- A `REGEX` pattern runs against every row on the main thread. Its length is
  bounded, but a catastrophic pattern can still stall the tab; running filters
  in a worker is a planned follow-up.

## Differences from Cytoscape Desktop

| Cytoscape Desktop                                                | Cytoscape Web                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| An unknown condition id rejects the whole file                   | Only its entry is skipped                             |
| `parameters` is required, keys must come in order                | Any key order; missing parameters take defaults       |
| A single top-level topology condition is unwrapped into the root | It is kept whole                                      |
| A criterion of the wrong kind can throw or match by accident     | It rejects every element and produces a warning       |
| Degree In/Out counts only directed edges                         | Every CW edge counts as directed                      |
| Java regular expressions                                         | JavaScript regular expressions, anchored at both ends |
| Filters are saved in the session                                 | Filters are saved in the workspace (IndexedDB)        |
