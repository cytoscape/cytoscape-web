# Filter

The FILTER tab of the left panel (after STYLE): a port of the "Filter" tab of
Cytoscape Desktop's Filter panel. Behavior, evaluation rules and the file
format are specified in `docs/specifications/FILTER_SPECIFICATION.md`.

## Structure

| File                                   | Role                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `FilterTab.tsx`                        | The tab: picks the filter, wires editing, applying and auto-apply          |
| `components/FilterHeader.tsx`          | Filter picker and options menu: new, rename, copy, remove, export, import  |
| `components/FilterNameDialog.tsx`      | "Create New Filter" / "Rename Filter"                                      |
| `components/ConditionList.tsx`         | A group's conditions (recursive), match all/any, "+" menu, topology header |
| `components/ColumnConditionEditor.tsx` | Column condition: column picker and a comparison for its type              |
| `components/DegreeConditionEditor.tsx` | Degree condition                                                           |
| `components/RangeInput.tsx`            | "between [low] and [high] inclusive" with a slider                         |
| `components/ApplyPanel.tsx`            | "Apply when filter changes", select / show, Apply, status line             |
| `utils/filterTabUtil.ts`               | Pure helpers: column options, labels, status text, defaults                |

`index.tsx` default-exports `FilterTab`, which `NetworkBrowserPanel` loads
lazily.

## Data flow

- Filters live in `FilterStore.workspaceFilters`; the tab edits a filter by
  computing a new tree with the `filterTreeImpl` path functions and storing it
  with `setWorkspaceFilterRoot`.
- Applying goes through `applyWorkspaceFilter` (`src/data/filter/`).
- The tab targets the active network view, else the current network, like the
  STYLE tab.
- UI state of the browser tab, in memory only: the shown filter
  (`selectedWorkspaceFilterId`) and "Apply when filter changes" per network
  (`workspaceFilterAutoApply`, default on below 100,000 nodes and edges).

## Behavior notes

- There is always a filter: the tab creates "Default filter" when there is
  none, and the last filter cannot be removed.
- "Apply when filter changes" re-applies 300 ms after the conditions change or
  another filter is picked. Opening the tab or switching networks applies
  nothing. Changing select / show always applies at once.
- Nested groups are added with the "Group" item of the "+" menu; Cytoscape
  Desktop's drag-and-drop grouping is not ported yet.
- A condition that cannot work on the network (missing column, wrong value
  type, invalid regex) shows a warning icon listing why.
