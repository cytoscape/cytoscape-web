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


## Mapping preview validation

Seven fixture-model tests pass, including continuous interpolation/clamping,
missing and disabled fallbacks, invalid domains, grayscale interpolation,
non-mutating category reassignment, discrete fallback, and domain fitting.
The new tests failed before the mapping implementation existed.

Browser verification in a separate Chrome tab:

- Moving kinase to the second fill row changed RAF1's rendered fill to #bdbdbd.
- Disabling Fill mapping restored #737373; enabling retained the assignments.
- Changing width range end from 5 to 9 changed rendered edge widths.
- A keyboard slider adjustment from 9 to 8.9 was restored to 9 with one Undo.
- Continuous log2FC colour mapping produced distinct grayscale node fills;
  Reverse swapped the endpoint output (EGFR changed to #d4d4d4).
- Collapsing Fill left its Map toggle active.
- Inline label passthrough changed EGFR's label to receptor using type.
- The mapping editor and graph were visually reviewed in light and dark themes.

Parent quiet checks passed again: 329 files, 4,219 passing tests, one skipped.
- Switching to MAPK showed its unmapped Fill; switching back retained EGFR's
  enabled mapping. Adding and removing a third discrete output row worked.


## Pane and menubar revision — September 8

Eight model tests pass, including snap points and both extremes. The new snap
test failed before implementation. Prototype lint/typecheck/build and parent
quiet checks pass (4,219 tests, one skipped). Browser checks confirmed:

- Clicking the selected Nodes tab or a different Edges tab reopens the sheet.
- Pointer dragging reaches 100% with no network, and 0% with a collapsed sheet.
- Dragging near 49% snaps to 50%; keyboard Home/End reach the extremes.
- View → Show network restores the previous split.
- Menubar trigger and popup item fonts both measure 13px with nowrap.
- Apps popup displays its entire message, with equal client and scroll widths.

The bottom-panel toolbar button now toggles the spreadsheet. The inspector uses
a right-sidebar icon. Theme switching remains available in View.

## Panel motion and compact chrome — September 8

The inspector remains mounted inside an animated width/slide wrapper, and the
spreadsheet retains its content while its height transitions. Hidden contents
are inert and excluded from accessibility navigation. Divider dragging disables
the height transition; reduced-motion preferences disable the new transitions.
Browser measurements confirm 200ms panel transitions and matching 49px heights
for the menubar, sidebar workspace header, and account footer. Opening and
closing both panels and the compact desktop layout were reviewed visually.

## Node-to-row reveal — September 8

Graph pointer and keyboard node activation opens the Nodes table and reveals
its row by stable node ID. Scrolling is confined to the table and accounts for
sticky headings. Resize observation keeps the row visible as the panel opens.
Browser checks confirmed JUN was revealed from offscreen, EGFR scrolled back to
the top, a closed Edges table switched to Nodes and opened, and JUN remained
correctly targeted after sorting (row 12) and repeated clicks after manual scroll.
Nine model tests pass, including the row-reveal scroll calculation, which failed
before implementation.

## Property layout and mapping grouping

Verified the live browser at 1280×800: default Fill has no disclosure trigger,
its editor remains inline, and enabling mapping reveals indented controls.
The redundant preset card is gone. Spreadsheet count is left-aligned while
tabs remain geometrically centred. Gradient and right endpoint swatch share
the same right edge, with hex text to the left of that swatch. Domain and range
are separate accessible groups with 4px internal spacing and a measured 16px
gap between them. Prototype lint, typecheck, nine tests and build pass; parent
quiet checks pass (4,219 tests, one skipped).
Hover was visually checked on Appearance: a compact rounded surface surrounds
the caret and label while the full row remains clickable.

## Inset spreadsheet surface

Added 8px top and 12px side/bottom margins, a 16px corner radius and a subtle
shadow. Browser verification at 1280×800 confirmed the full-height sheet stays
inside its parent with the network at zero height, collapse retains a 44px bar,
and clicking Nodes reopens it. Resize calculations account for the top margin.
Prototype lint, typecheck, tests and build passed.

## Hover and shadow refinement

Extended style hover surfaces across the available row width while retaining
rounded corners and vertical inset. Both spreadsheet toggle areas activate one
shared header surface, inset 5px vertically and 6px horizontally; tabs retain
their own interaction. Increased the sheet shadow to a soft 16px blur with
a smaller contact shadow. Visually checked the sidebar and spreadsheet hover
in the live browser and verified collapse/reopen. Prototype checks and build pass.
Removed the canvas SVG focus outline while retaining keyboard interaction
and individual node focus indicators.
