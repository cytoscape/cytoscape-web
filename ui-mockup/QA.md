# Validation record

Verified on 2026-09-07.

- Prototype lint, TypeScript checking, four fixture-model regression tests,
  and production build passed.
- Parent `npm run test:checks:quiet` passed: 4,219 tests passed, one skipped,
  across 329 files, plus lint/typechecking. No production runtime code changed.
- Regression tests were first run against the missing model implementation and
  failed, then passed after implementation. They cover immutable node creation,
  endpoint validation, column identity/rename, and numeric sorting.

Browser checks in a separate managed Chrome tab:

- Tab selector centre and spreadsheet centre both measured at x=792px in a
  1280px viewport. Both bar sides toggle visibility. Changing tabs while
  collapsed preserves the collapsed state.
- New node and column creation, header rename, numeric ascending sort, and
  valid edge creation worked. Missing target produced an inline error.
- Changing the label mapping from name to type changed SVG label text.
  Selected-node label size overrides appeared on the graph in dark theme.
- HiView scene displayed MAPK cascade, breadcrumbs, collapsed spreadsheet,
  and an open inspector. Back returned to Human cell hierarchy; Open MAPK
  cascade drilled in again.
- At 90% confidence, visible MAPK edges decreased from 12 to 2.
- Keyboard resizing increased spreadsheet height from 40% to 45%.
- Sidebar collapse and theme switching worked. Reviewed the neutral graph,
  compact style controls, and centred spreadsheet bar visually.

These checks cover the fixture prototype only. Full keyboard spreadsheet
navigation, production-scale rendering, persistence, import, account actions,
and plugin integrations require production implementation and testing.
Optional WebMCP scene selection is feature-detected but was not exercised in a
WebMCP-enabled browser. Generated catalog components are unmodified; lint covers
the authored app, editor components, and fixture model.
