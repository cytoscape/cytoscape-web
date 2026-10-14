# Filter

The FILTER tab of the left panel (after STYLE): a port of the "Filter" tab of
Cytoscape Desktop's Filter panel. Behavior, evaluation rules and the file
format are specified in `docs/specifications/FILTER_SPECIFICATION.md`.

## Structure

| File                                   | Role                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `FilterTab.tsx`                        | The tab: picks the filter, wires editing, applying and auto-apply                               |
| `components/FilterHeader.tsx`          | Filter picker and options menu: new, new from description, rename, copy, remove, export, import |
| `components/FilterNameDialog.tsx`      | "Create New Filter" / "Rename Filter"                                                           |
| `components/FilterFromDescription.tsx` | "New filter from description": the popover asking the LLM for a filter                          |
| `llm/generateFilter.ts`                | No React, no store: request → check the answer → at most two repairs                            |
| `components/ConditionList.tsx`         | A group's conditions (recursive), match all/any, "+" menu, topology header                      |
| `components/ConditionDnd.tsx`          | Drag and drop of conditions: provider, drag handle and drop target hooks                        |
| `components/ColumnConditionEditor.tsx` | Column condition: column picker and a comparison for its type                                   |
| `components/DegreeConditionEditor.tsx` | Degree condition                                                                                |
| `components/RangeInput.tsx`            | "between [low] and [high] inclusive" with a slider                                              |
| `components/ApplyPanel.tsx`            | "Apply when filter changes", select / show, Apply, status line                                  |
| `utils/filterTabUtil.ts`               | Pure helpers: column options, labels, status text, defaults                                     |

`index.tsx` default-exports `FilterTab`, which `NetworkBrowserPanel` loads
lazily.

## Data flow

- Filters live in `FilterStore.workspaceFilters`; the tab edits a filter by
  computing a new tree with the `filterTreeImpl` path functions and storing it
  with `setWorkspaceFilterRoot`.
- Applying goes through `applyWorkspaceFilter` (`src/data/filter/`).
- "New filter from description" (`docs/specifications/LLM_FILTER_GENERATION_SPEC.md`):
  the popover reads the LLM settings (`useLLMQueryStore`, key scoped with
  `selectApiKey`) and the target network and tables, and hands them to
  `generateFilter`. That builds the network context and the messages
  (`src/models/FilterModel/impl/generation/`), sends them with
  `requestChatCompletion`, and reads each answer with `readFilterAnswer`.
  The popover adds the result with `addWorkspaceFilters`, sets its display
  mode and selects it, so "Apply when filter changes" applies it as for
  any filter picked. `FilterHeader` gets the network id from `FilterTab`
  only once the network and its tables are loaded, and closes the popover
  (aborting its request) when the tab switches networks.
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
- Conditions are moved and grouped by dragging their handle (`DragIndicator`
  icon), as in Cytoscape Desktop: into a gap to move, onto a group or a
  topology condition to add at its end, onto another condition to group the
  two. Groups emptied by a move are removed. `components/ConditionDnd.tsx` uses
  `@dnd-kit/core`: mouse, pen and touch (tablets) through its pointer sensor,
  and the keyboard (focus the handle, Space, arrows, Space; Escape cancels).
  The "Group" item of the "+" menu adds an empty group.
- A condition that cannot work on the network (missing column, wrong value
  type, invalid regex) shows a warning icon listing why.
