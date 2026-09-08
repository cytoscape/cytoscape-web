# Cytoscape Web UI study

An isolated, local design prototype using actual shadcn components (Base UI),
React, Tailwind, and fixture data. The shell is plain monochrome in both themes.
It does not access production stores, authentication, or IndexedDB. Refreshing
resets the fixture edits.

## Run

Use Node 24 to match the parent repository.

```sh
cd ui-mockup
npm ci
npm run dev
```

Open http://localhost:5511. The **UI study** menu switches among the four scenes:

- Main workspace: `/`
- Dark style editor with selected nodes: `/?scene=styles`
- Drilled-in HiView subsystem: `/?scene=hiview`
- Inline mappings: `/?scene=mappings`

Generated concepts are in `public/concepts/`. These are visual explorations;
the running prototype is authoritative for labels, layout, and interaction.

## Try

- Switch networks in the sidebar header; collapse it from the main menubar.
- Expand Nodes → Labels, edit values, change the mapped attribute, select nodes
  and apply a label-size override. Changes appear on the graph immediately.
- Use the centred Nodes / Edges / Network tabs. Click either remaining side of
  their bar to collapse or expand the table. Drag the divider or use its arrow
  keys to resize. Initial height is 40%. The divider snaps at 33%, 40%, 50%, and 67%,
  and reaches 0% (network only, tab bar retained) or 100% (spreadsheet only).
  Clicking any tab reopens the spreadsheet. View → Hide/Show network switches
  between the full spreadsheet and the previous split. Arrow keys step through
  snap points; Home and End reach the two extremes.
- Edit a cell directly. Enter commits; Escape restores its previous value.
  Header menus rename and sort columns. The blank row adds a node or property;
  the blank header adds a column. New edges require two existing endpoints.
- Switch to Human cell hierarchy and open MAPK cascade. Back restores the
  hierarchy. The style target follows the visible subsystem. The right inspector
  filters graph edges by confidence and interaction type.
- Use View → Dark/Light appearance to change theme. The bottom-panel toolbar
  icon toggles the spreadsheet; the right-sidebar icon toggles the inspector.

Import remains in File and is disabled in this fixture prototype. Account,
application integrations, image/chart styling, and a persistent style library
are outside this study. The simple SVG graph and DOM table are interaction
fixtures, not production-scale renderers.

## Mapping preview

Open **UI study → 04 · Inline mappings**. This seeds node fill by `type` and
edge width by `confidence` the first time; later visits retain your edits.

Supported properties are node fill, diameter, label font size, edge width,
edge colour, and label text. Each has a Map toggle and a collapsible inline
editor. Turning Map off uses the default and retains the mapping configuration.
Collapsing the editor keeps the mapping active.

Continuous numeric and colour mappings use two endpoints, editable domain
fields, Fit to data, and Reverse. Numeric outputs also have a range slider.
Missing values use the editable fallback; out-of-domain values clamp.
Discrete mappings group attribute values under each output value. Select values
opens a searchable picker with counts. Assigning a category to a different row
moves it; deleting a row returns its categories to the fallback. Attribute
changes clear the assignments because they refer to the previous column.

Label passthrough is inline. Selected label-size overrides take precedence over
mapped sizes. Mapping slider changes update the graph live and commit a single
undo entry per gesture. Fixture edits are in memory only.

## Validate

```sh
npm run lint
npm run typecheck
npm run test:quiet
npm run build
```

See [QA.md](QA.md) for browser checks and [MIGRATION.md](MIGRATION.md) for the
revised production migration plan. All dependencies are owned by this folder;
the parent TypeScript project excludes it.
