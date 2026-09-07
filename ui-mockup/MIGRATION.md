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
an explicit mapped-state label, and a property-anchored mapping popover. Display
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
