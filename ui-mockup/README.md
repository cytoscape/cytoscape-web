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

Open http://localhost:5511. The **UI study** menu switches among the three scenes:

- Main workspace: `/`
- Dark style editor with selected nodes: `/?scene=styles`
- Drilled-in HiView subsystem: `/?scene=hiview`

Generated concepts are in `public/concepts/`. These are visual explorations;
the running prototype is authoritative for labels, layout, and interaction.

## Try

- Switch networks in the sidebar header; collapse it from the main menubar.
- Expand Nodes → Labels, edit values, change the mapped attribute, select nodes
  and apply a label-size override. Changes appear on the graph immediately.
- Use the centred Nodes / Edges / Network tabs. Click either remaining side of
  their bar to collapse or expand the table. Drag the divider or use its arrow
  keys to resize. Initial height is 40%, with a 25–65% range.
- Edit a cell directly. Enter commits; Escape restores its previous value.
  Header menus rename and sort columns. The blank row adds a node or property;
  the blank header adds a column. New edges require two existing endpoints.
- Switch to Human cell hierarchy and open MAPK cascade. Back restores the
  hierarchy. The style target follows the visible subsystem. The right inspector
  filters graph edges by confidence and interaction type.
- Toggle the sun/moon control to change theme.

Import remains in File and is disabled in this fixture prototype. Account,
application integrations, image/chart styling, and a persistent style library
are outside this study. The simple SVG graph and DOM table are interaction
fixtures, not production-scale renderers.

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
