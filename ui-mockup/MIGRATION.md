# Production migration decisions

This prototype is ready for design review. Production migration has not begun.

## Carry forward

Use the default neutral shadcn tokens, thin borders, quiet surfaces, and compact
system typography. Color should communicate network data only when explicitly
configured by the user. There is no green brand theme.

Use a fixed 304px shadcn Sidebar with a workspace/network picker at the top and
account menu in its footer. Put the horizontal shadcn Menubar in the content
area to its right. Keep the sidebar exclusively for style editing, with two
disclosure levels: Nodes → Labels, Edges → Line, Network → Background.

Adopt Pixelmator's direct property rows: a value field and slider where useful,
an explicit mapped-state label, and a collapsible inline mapping editor. Display
selected-node overrides together with their scope and a reset action. Keep the
active network/subsystem target visible above the controls.

Start the spreadsheet at 40% of the content area and remember the user's size.
Centre the three tabs across the entire spreadsheet width. Both remaining sides
of the header toggle visibility; tab and resize actions must never trigger that
toggle. Keep rename/sort in heading menus and import in the main File menu.
Use draft rows/columns with validation and explicit edge endpoint selection.

Keep HiView navigation in the canvas: breadcrumbs, Back, and a visible subsystem
title. Styles target the subsystem currently displayed. Use a separate right
inspector for filters and properties; do not add sidebar tabs or a second canvas.

## Sequence

1. Review these three scenes with realistic large-network workflows. Resolve
   mapping discovery, style library management, compact-window behavior, and
   spreadsheet keyboard navigation before replacing production components.
2. Add the agreed shadcn primitives and neutral tokens to production in an
   isolated change. Keep production React/build versions independent from this
   prototype's scaffold. Inventory MUI imports and replacement requirements.
3. Replace the shell, workspace picker, account footer, and Menubar. Connect
   existing commands and stores through adapters; preserve routing, auth,
   public APIs, keyboard shortcuts, and persistence behavior.
4. Replace the style panel. Bind controls to existing visual style models,
   including named styles, defaults, mappings, and bypasses. Coalesce slider
   drags into one undo transaction. Preserve MULTIPLE_VISUAL_STYLES.md semantics.
5. Reskin the production spreadsheet chrome while retaining its virtualized
   data grid. Add validated draft creation, rename/sort menus, and keyboard
   editing against real table actions. Do not transplant this small DOM table
   into production.
6. Integrate HiView breadcrumbs, target scope, and the filters inspector with
   existing hierarchy navigation. Preserve selections and viewport state on Back.
7. Remove MUI only once all consumers, dialogs, portals, menus, and plugin-facing
   surfaces are migrated. Preserve the repository's dialog dismissal policy.

## Acceptance gates

Check light/dark contrast, keyboard focus, screen readers, sidebar collapse,
table toggling/resizing, mapping and override undo, draft validation, and HiView
scope. Test large graphs and virtualized tables, named-style round trips,
reload/persistence, import, and public API compatibility. Run the quiet app
checks and the targeted e2e specs for each migrated feature.

## Findings from this study

- Centre tabs with equal flexible space on each side; right-side count text
  must not shift their centre.
- Scale graph positions to the available canvas while keeping node and label
  sizes readable as the spreadsheet resizes.
- Disclose units on confidence controls: the inspector uses 0–100%, while
  fixture edge values use 0–1.
- A blank edge row needs endpoint pickers and validation; silently creating an
  edge on the first entered value would be ambiguous.
- The prototype preserves in-memory edits between networks, but does not prove
  production persistence, performance, or a full Excel keyboard model.


## Inline mapping preview findings

The second iteration implements property-local Map toggles for node fill, size,
label size, edge width/colour, and label passthrough. Mapping configuration stays
attached to each property and survives disabling. Collapsed summaries retain
attribute and output information; collapsing a tree group never disables maps.

Discrete mapping rows represent output styles, with searchable multi-selection
of category values. A category belongs to at most one output row. Reassignment
moves it, and removing an output row falls back for its previously assigned
categories. Production adapters can expand these grouped rows into the existing
per-category discrete map without changing its data semantics.

Continuous previews support numeric and colour interpolation with two endpoints,
clamping, numeric domain/range fields and sliders, Fit to data, and output
reversal. Missing/invalid inputs use the property's default. The graph resolves
selected label overrides after mapping. Mapping slider gestures have one undo
transaction; production should apply the same transaction behavior to all
continuous controls.

Do not flatten imported production mappings to two endpoints. Preserve any
intermediate stops and out-of-range rules; provide an advanced editor or a
faithful read-only summary until the new UI supports them. Disabling a map in
this prototype retains its draft configuration; production must decide where to
retain that disabled draft without changing CX2 semantics.


## Pane behavior revision — September 8

Tabs now reopen the spreadsheet when collapsed, including the currently selected
tab. The resize handle stays available at both extremes. Pointer resizing snaps
near 33/40/50/67 percent and to 0/100 percent; keyboard arrows step through those
stops. At 0 the tab bar remains for reopening; at 100 the network is hidden.
View includes Hide/Show network and Hide/Show spreadsheet. Menu triggers and
items share 13px typography and never wrap; popup widths follow their content
instead of inheriting the trigger width.
