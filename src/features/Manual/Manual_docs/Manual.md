# Manual

## Overview

The in-app user manual, at `/manual/*`. Help → User Manual opens it in a new
tab. It replaces the Read the Docs manual (`web-manual.cytoscape.org`), which
redirects here (#658, #660).

The manual ships with the app, so it always describes the running version.
Pages can embed working parts of the editor (`LiveDemo`), image sequences
captured from the app for a procedure (`Steps`), and tables generated from
the code (`VisualPropertyTable`).

The live demos are hidden while step sequences are tried in their place:
`LIVE_DEMOS_ENABLED` in `components/liveDemoSwitch.ts` is `false`. The demo
code and every `<LiveDemo>` stay; setting it to `true` brings them back.

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
ManualApp            route element: app bar, page list, page
├── PageList         grouped sidebar, nesting the current page's sections; a menu drawer below md, and below 1600px when the column is pinned
├── PageFooter       previous / next page
├── ManualPage       lazy-loads one MDX page; owns all content typography
│   └── <page>.mdx   rendered with mdxComponents
│       ├── LiveDemo → LiveDemoBody   editor parts on bundled fixtures (hidden)
│       │   └── demo/                 Layout, App API and Link side panels
│       ├── DemoOnly / WithoutDemo    text shown only with / without the demos
│       ├── Steps                     a numbered list shown step by step beside its images
│       ├── VisualPropertyTable       generated from getDefaultVisualStyle()
│       ├── BrowserStorageView        read-only counts of what the browser stores
│       └── Note                      callout
└── SnackbarMessageList  messages from editor parts inside demos
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

### Page Layout

- **Page list:** grouped (Getting Started, Working with Networks, Extending
  and Troubleshooting, About; `MANUAL_GROUPS` in `pages.ts`). The current
  page's `h2` sections nest under it and the section in view is marked; it
  opens its `h3` subsections. Previous/next links sit at the foot of each
  page.
- **Text:** a 68-character measure, 17px, 1.7 line height, more space above
  headings than below, bold at weight 600.
- **Demo:** on `lg` screens and up, the page's demo is pinned in a
  right-hand column while the text scrolls (`DemoSlot`); the text keeps a
  pointer to it.
  In the column the demo fills the height and its table becomes a tab.
  **Expand** enlarges the column over the text (same element, so the demo
  keeps its state); **Shrink** restores it.
- **Page list beside a pinned demo:** below 1600px the list folds into the
  menu button, so the demo gets the width. Pages without a demo keep it.
- **Wide blocks:** tables, demos and `Steps` take the page width; text keeps
  the 68-character measure.
- **Moved anchors:** when a page is split, `movedAnchors` maps its old
  anchors to the page that has them now, so `quick-tour#data` opens
  `menus#data`. `content.test.ts` checks every moved anchor exists.

### ManualPage

- Scrolls to the URL hash after the page renders, else to the top.
- Reports the page's `h2`/`h3` headings to the page list.

### LiveDemo

- Tries once per document to clear the sandbox database (`sandbox.ts`); a
  failed clear leaves old rows behind and the demo still runs. It then loads
  its fixtures with `networkApi.createNetworkFromCx2`. The first fixture is
  shown.
- Props:

  | Prop | Values | Default |
  | --- | --- | --- |
  | `fixtures` | `gal-filtered` (10 nodes, expression columns), `hsf1-neighborhood` (6 nodes, 4 shared names) | `['gal-filtered']` |
  | `panels` | `renderer`, `toolbar` (floating tools over the renderer), `style`, `filter`, `layout`, `api`, `url` (side panel tabs), `table` (bottom) | `['renderer', 'style']` |
  | `actions` | `merge`, `exportImage` — header buttons that open the editor's dialogs | none |
  | `height` | renderer row height in pixels | 520 |
  | `caption` | header text | a default line |

- The renderer shows the workspace's current network. With several networks
  (fixtures or a merge result), a picker in the header switches between them.
- **Reset** deletes every network in the demo's workspace and loads the
  fixtures again. Leaving the page does the same.
- Outside the manual scope it renders a notice instead: it must never write
  to a user's workspace.
- One demo per page. A demo sets the workspace's current network and
  `ui.activeNetworkView`, which the Style panel, export, undo and the
  renderer's context menu read.
- Editor parts that navigate (Merge opens its result with
  `navigateToNetwork`) stay in the manual: `navigateToNetwork` does nothing
  in a manual tab (`src/data/hooks/navigation/urlManager.ts`).

### Steps

- `<Steps sequence="import-table">` wraps one numbered list and shows it
  one step at a time: the step's text and position ("Step 6 of 13") beside
  its image, **Back** and **Next**, and a numbered button per step. The arrow
  keys move too. Below `md` the image sits under the text.
- Each frame of the sequence names the list item it illustrates (`step`,
  1-based). An item without a frame shows the previous one; items before the
  first frame show the first.
- The image box keeps the widest frame's aspect, so the widget does not
  change height between steps. Clicking the image opens it full size.
- One `Steps` per page (`content.test.ts`).

### BrowserStorageView

- On the Privacy Policy page. Counts rows per object store of the editor's
  `cyweb-db`, lists the app's localStorage keys and the site's cookie names.
  It never shows values and never writes.
- Checks `indexedDB.databases()` before opening `cyweb-db`, because opening a
  missing database would create it.
- `STORE_LABELS` is typed over `ObjectStoreNames`: a new object store fails
  the type check until it has a label.

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
| Working demo | `<LiveDemo />` (props: `fixtures`, `panels`, `actions`, `height`, `caption`) |
| Text about the demo | `<DemoOnly>…</DemoOnly>`; text in its place while demos are hidden: `<WithoutDemo>…</WithoutDemo>` |
| Procedure with an image per step | `<Steps sequence="import-table">` around a numbered list (sequence in `screenshots/recipes.ts`) |
| Visual property list | `<VisualPropertyTable group="node" />` |
| App icon in text | `<UiIcon name="fit" label="Fit button" />` |
| Screenshot of the app | `<Screenshot id="app-overview" />` (recipe in `screenshots/recipes.ts`) |

MDX is JSX: close every tag (`<br />`, `<a id="x" />`), and escape `{`, `}`
and `<` in text.

Name UI the way the UI names it: menu paths as **Data → Import → Network
from File**, labels in bold, exactly as the source spells them. Check a label
in the source before writing it.

## Screenshots and Icons

Images of the app come from the app, not from a camera.

- **Icons** — `<UiIcon name="fit" label="Fit button" />` draws an app icon in
  the text. Most entries import the icon the app's component exports
  (`FitIcon`, `ShareIcon`, `INSERT_COLUMN_GLYPH`, `NetworkSourceChip`…), so
  a changed icon changes in the manual too. Names: `components/uiIconNames.ts`.
- **Screenshots** — `<Screenshot id="cell-view" />` shows
  `public/manual-assets/generated/<id>.png`, captured by a recipe in
  `screenshots/recipes.ts`: a fixed viewport, steps that drive the app
  (import a network, click by `data-testid`, role, text or `aria-label`), and
  the element to crop to.
- **Step sequences** — `SCREENSHOT_SEQUENCES` in the same file. One run of
  the app captures every frame in order; each frame continues from the state
  the previous one left. A frame lists the steps that reach its state, the
  elements to ring (`highlight`: what the reader acts on), and the crop.
  Images: `public/manual-assets/generated/<sequence>/<frame>.png`.

Sequences:

| Id | Page › section | Frames |
| --- | --- | --- |
| `import-table` | Node and Edge Column Data › Basic Operation | 11 |
| `network-from-table` | Creating and Saving Networks › Import a Network from a Table | 10 |
| `merge` | Merging Networks › Basic Operations | 7 |
| `column-filter` | Filters › Select Nodes with a Column Filter | 7 |
| `styles-tutorial` | Styles › Creating a Basic Style with Discrete and Continuous Mappings | 10 |

Recipe steps (`ScreenshotStep`):

| Step | Does |
| --- | --- |
| `importNetwork` | Data → Import → Network from File..., upload a repo file, wait for its name and the renderer |
| `click`, `hover`, `waitFor` | Act on a target: `testid`, `role` + `name`, `text`, `label` (exact `aria-label`), or `selector` (a Playwright selector, for elements with neither, such as a Style panel row's boxes). Role targets include elements an open popover hides from assistive technology. |
| `upload` | Set the file of the `<input type="file">` inside a target |
| `press` | Press a key |
| `fill` | Replace a field's text |
| `selectNodes` | Select nodes of the current network through `window.CyWebApi`, then wait for what the selection loads |
| `wait` | Wait a fixed time, for an animation or layout |

Before each capture the pointer moves to the bottom-right corner, so no
hover tooltip shows, and the focused element loses focus, so no focus ring
shows, unless it is inside an open menu, which would close.

| Task | How |
| --- | --- |
| Capture one or more | `node scripts/capture-manual-screenshots.mjs cell-view import-table` (recipe or sequence ids; builds the app and serves it on port 5502; `MANUAL_SCREENSHOT_URL` uses a running server) |
| Capture all | `node scripts/capture-manual-screenshots.mjs` |
| Capture for commit | the **Manual Screenshots** workflow (Actions tab, on your branch, "commit" checked). It runs in the same Linux Playwright image as CI, so images do not change with the machine that took them. A PR that changes a recipe runs it and uploads the images as an artifact. |
| Add an image | add a recipe, put `<Screenshot id="…" />` on a page, capture |

`content.test.ts` fails when a page names an unknown screenshot, sequence or
icon, a recipe or frame has no image, a recipe or sequence has no page, a
frame names a list item the page's list does not have, or `sources` match
nothing. The drift check lists a screenshot or sequence for recapture when
its `sources` change; recapturing any frame of a sequence clears it.

Two images remain hand-taken: the NDEx sign-in page (NDEx's page, not the
app's) and My Workspaces (needs an NDEx account). `HAND_TAKEN_IMAGES` in
`content.test.ts` lists them with the reason; a page that uses any other
image outside `generated/` fails the test. The `sub-network-viewer` recipe
loads its interactions from `idekerlab.ndexbio.org`, so capturing it needs
the network.

## Manual Drift Check

`scripts/check-manual-drift.mjs` lists the pages a branch's code changes ask
someone to review. The rules are in `drift.ts`, tested in `drift.test.ts`.

- A page is listed when a changed file matches its `sources` and the page's
  `.mdx` did not change. Tests, `test/**` and the manual itself never count.
- `DEMO_COPIES` names manual code that copies app logic instead of importing
  it (`DemoUrlPanel`, `DemoApiPanel`, `BrowserStorageView`). A change to the
  logic lists the copy too, and editing the page does not clear it.
- `AGENTS.md` (Docs Change With Behavior) tells every agent to run the
  check and to update or clear each listed page.
- A trailer clears a page: `Manual-Reviewed: merge (tooltip wording only)`,
  several pages separated by commas, or `all`. The reason in parentheses is
  required. The check reads commit messages and the PR body.

| Where | Mode |
| --- | --- |
| CI job **Manual Drift** (`.github/workflows/ci.yml`) | Warning: annotations and a job summary; the job passes. Set `MANUAL_DRIFT_STRICT: '1'` to block. |
| Agents and people, before pushing | `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-manual-drift.mjs [--base <ref>] [--strict]` |

Keep `sources` narrow: list the files whose behavior the page states, not the
whole feature directory. Against the last 50 merges into `development`, the
current globs list at least one page for 30.

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
5. **Step sequences in the section they illustrate, demos optional.** A
   page's single demo fits one section of the page. A sequence sits in its
   section and shows the state for each step of a procedure, and the recipe
   that drives the capture is the same data that keeps it current.
