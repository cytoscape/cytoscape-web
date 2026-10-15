# Manual

## Overview

The in-app user manual, at `/manual/*`. Help → User Manual opens it in a new
tab. It replaces the Read the Docs manual (`web-manual.cytoscape.org`), which
redirects here (#658, #660).

The manual ships with the app, so it always describes the running version.
Pages can embed working parts of the editor (`LiveDemo`) and tables generated
from the code (`VisualPropertyTable`) instead of screenshots.

## Architecture

- `/manual/*` is a top-level route in `src/App.tsx`, a sibling of `/`. It
  never mounts `AppShell`, so no workspace loads.
- A `/manual` tab opens the sandbox database `cyweb-manual-db`, not the
  user's `cyweb-db` (`src/data/db/dbScope.ts`, #839). Every store write a demo
  makes lands there. The scope is fixed at page load; links between the
  manual and the editor are full page loads.
- Page content is MDX, compiled to React components at build time by
  `@mdx-js/rollup` (`vite.config.ts`). No markdown parser ships to the
  browser. Each page is its own lazy chunk; the manual chunk is not
  prefetched.

## Component Structure

```
ManualApp            route element: app bar, page list, page, "On this page"
├── PageList         sidebar (drawer below the md breakpoint)
├── ManualPage       lazy-loads one MDX page; owns all content typography
│   └── <page>.mdx   rendered with mdxComponents
│       ├── LiveDemo → LiveDemoBody   renderer + Style panel on a fixture
│       ├── VisualPropertyTable       generated from getDefaultVisualStyle()
│       └── Note                      callout
└── OnThisPage       h2/h3 list, built from the rendered page
```

## Components

### ManualApp

- `/manual` redirects to the first page (`introduction`).
- Read the Docs paths redirect to the matching page and keep the anchor:
  `/manual/en/latest/Styles.html#how-mappings-work` →
  `/manual/styles#how-mappings-work` (`resolveManualPath` in `pages.ts`). The
  domain redirect therefore only has to forward
  `web-manual.cytoscape.org/<path>` to `<app>/manual/<path>`.
- An unknown path shows "Page not found" with the page list.
- Below the `md` breakpoint the page list is a drawer that closes on
  click-away. It is a menu, not a form, so it falls in the out-of-scope class
  of `docs/specifications/DIALOG_DISMISS_POLICY.md`.
- **Open Cytoscape Web** is a plain link to the base URL: a full page load.

### ManualPage

- Scrolls to the URL hash after the page renders, else to the top.
- Reports the page's `h2`/`h3` headings to `OnThisPage`.

### LiveDemo

- Tries once per document to clear the sandbox database (`sandbox.ts`); a
  failed clear leaves old rows behind and the demo still runs. It then loads a
  bundled fixture with `networkApi.createNetworkFromCx2` and renders
  `CyjsRenderer` and `VizmapperView` on it.
- **Reset** deletes the demo network and loads a fresh copy.
- Outside the manual scope it renders a notice instead: it must never write
  to a user's workspace.
- One demo per page. A demo sets the workspace's current network, which the
  Style panel and undo read.

### VisualPropertyTable

- One row per visual property of a group, from `getDefaultVisualStyle()`.
  Description: the property's `tooltip`, else
  `VISUAL_PROPERTY_DESCRIPTIONS` (`generated/visualPropertyRows.ts`).
- `visualPropertyRows.test.ts` fails when a property has no description, or
  a description names a property that no longer exists.

## Writing a Page

1. Add the page to `MANUAL_PAGES` in `pages.ts`: `slug`, `title`,
   `legacyName` (the Read the Docs file name, if any), `sources` (globs of the
   code the page describes) and `load`.
2. Write `content/<slug>.mdx`. Start with `# Title`.
3. Text only. Presentation belongs to `ManualPage` and `mdxComponents`.

Rules for content:

| Need | Write |
| --- | --- |
| Heading anchor | Automatic from the heading text (`## How Mappings Work` → `#how-mappings-work`). To keep an old explicit anchor too, put `<a id="old_anchor" />` on the line above. |
| Link to another page | `[Styles](styles)`, `[mappings](styles#how-mappings-work)` |
| Link within the page | `[mappings](#how-mappings-work)` |
| Link to the editor | `[Cytoscape Web](/)` — becomes a full page load |
| External link | `[NDEx](https://www.ndexbio.org)` — opens a new tab |
| Image | `![Alt text](manual-assets/<Folder>/<file>.jpg)` — files live in `public/manual-assets/`, resolved against the base URL |
| Callout | `<Note>…</Note>`, `<Note severity="warning">…</Note>` |
| Working demo | `<LiveDemo />` (props: `panels`, `height`, `caption`) |
| Visual property list | `<VisualPropertyTable group="node" />` |

MDX is JSX: close every tag (`<br />`, `<a id="x" />`), and escape `{`, `}`
and `<` in text.

Name UI the way the UI names it: menu paths as **Data → Import → Network
from File**, labels in bold, exactly as the source spells them. Check a label
in the source before writing it.

## Screenshots

The images in `public/manual-assets/` come from the Read the Docs manual
(v1.0.x), scaled to 1400 px and converted to JPEG. Some show older UI. Prefer
a `LiveDemo` or a generated table where one fits, and remove an image when
its page no longer uses it.

## Integration Points

- **`src/data/db/dbScope.ts`** — the sandbox database and reset channel.
- **`clearSandboxDb`** (`src/data/db/index.ts`) — empties the sandbox; refuses
  in the editor scope.
- **`networkApi`** (`src/app-api/core/networkApi.ts`) — loads and deletes the
  demo network.
- **UiStateStore** — `setActiveNetworkView` for the demo network.
- **Help → User Manual** (`ToolBar/HelpMenu/TutorialMenuItem.tsx`) — opens
  `<base>/manual/` in a new tab.

## Design Decisions

1. **A route, not a separate site.** The manual ships with each release, so
   it cannot describe a different version than the one running.
2. **A sandbox database, not a guard on writes.** Stores persist from many
   places (`persistNetworkSlices`, `scheduleWrite`, direct `put*ToDb`). A
   separate database covers all of them; a write guard would have to find
   each.
3. **MDX compiled at build time.** Pages stay plain text for reviewers and
   for AI-drafted changes, live components embed as JSX, and the browser
   receives compiled components only.
4. **Generated tables over hand-written lists** where the code holds the
   data. A test fails when the code and the manual's text disagree.
