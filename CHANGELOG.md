# Changelog

All notable changes to Cytoscape Web are documented here.

## [Unreleased]

### Changed

- Network from File opens a CX2 file within the same size limits as Open Network(s) from
  NDEx, using the node and edge counts the file lists, instead of refusing any file over
  5 MB. A file over the limits is not read, and a message says why. Tables and SIF files
  keep the 5 MB limit (#911)

### Fixed

- Fix issue where Network from File did nothing, with no message, when the browser could
  not read the file (#911)

## [1.1.1] — 2026-10-27

An in-app user manual, keyboard shortcuts for undo, redo and delete, a Select menu, a new
default model for LLM Query now that `gpt-3.5-turbo` is retired, and fixes to undo,
rendering, CX2 import, Layout Tools and the style editor.

### Added

- A user manual inside the app at `/manual`, opened from Help → User Manual. Procedures
  show one step at a time with a screenshot beside the text, and the Styles page has a
  live demo. The manual uses its own sandbox database, so it never touches your
  workspace (#841, #885)
- Go to Cytoscape Web in the manual's header switches back to the editor tab that opened
  the manual, instead of opening a second editor (#889)
- Keyboard shortcuts in the network view: Ctrl/⌘+Z undoes, Ctrl/⌘+Shift+Z or Ctrl+Y redoes,
  and Delete or Backspace deletes the selected nodes and edges (#867)
- A Select menu with Select All, Deselect All, Hide Selected and Show All. Select All
  (Ctrl/⌘+A) includes hidden elements, and Hide Selected deselects what it hides (#837)
- Open private NDEx networks from an NDEx share link: a link carrying `?accesskey=` opens
  the network without signing in (#808)

### Changed

- LLM Query's default model is now `gpt-6-luna`, replacing `gpt-3.5-turbo`, which OpenAI
  shut down on 2026-10-23. The model suggestions list current models (#833)
- Manage Apps has one Install from URL field for both React apps and service apps. The
  app behind the URL decides which kind it installs as (#828)
- Layout Tools is only the floating panel opened from Layout → Layout Tools. The panel
  below the workspace list is gone, and the floating panel can be dragged by its title
  bar (#899)
- The Sub Network Viewer tab shows only when the current network is a hierarchy (#878).
  Leaving a hierarchy with an app's tab selected keeps the right panel open (#882)
- The Help dialogs close with an X in the corner. About links to the code, Cytoscape
  Desktop and the roadmap, and Report a Bug no longer asks for your version, OS and
  browser (#829)
- The STYLE tab's property list fills the panel, the style picker is larger, and the
  Styles dialog's search field stays in place while the list scrolls (#905)
- The REMOVE button in the Remove Filter dialog is red

### Fixed

- Fix issue where undoing Delete Selected Nodes or Edges restored the elements without
  their views, so they came back invisible and lost their positions (#858)
- Fix issue where undoing a drag of several nodes moved back one node per undo (#872)
- Fix issue where every style or table change stored another copy of the network's view,
  growing browser storage and slowing selection and node moves (#862)
- Fix issue where importing a CX2 file whose `status` aspect was not last dropped its
  nodes or edges without warning (#836)
- Fix issue where Layout Tools' Scale slider moved the network off center, x1.0 did not
  restore the original layout, and the x0.5 mark scaled by 0.6 (#894)
- Fix issue where Layout Tools stayed on "Applying layout..." when scaling a network with
  no nodes; it is now disabled with nothing to scale (#894)
- Fix issue where the Scale slider showed the wrong value after undo or redo, so moving
  it next shrank or grew the network (#900)
- Fix issue where dragged dialogs and continuous-mapping handles fell behind the
  pointer, and a handle saved a value short of where it was dropped (#902)
- Fix issue where a FILTER tab edit followed by Apply or the select/show switch applied
  the filter again 300 ms later, undoing a Show All made in between (#865)
- Fix issue where Passthrough mapping was disabled for every color property (#813)
- Fix issue where the mapping form showed a blank Column and Mapping Type for an
  existing mapping it would not offer as a new one (#835)
- Fix issue where an unmodified local network could not be saved as a copy to NDEx from
  its row menu (#822)
- Fix issue where the NDEx / Local chip on a network row lost its tooltip (#875)
- Fix issue where the cookie banner's Learn more link returned a 404 (#841)
- Fix issue where the Key Column for Network list in Import Table opened behind the
  dialog and could not be clicked (#841)
- Fix issue where the merge dialog's buttons had wrong or missing names for screen
  readers (#841)
- Fix typos in the merge and continuous-mapping forms (#856)

### Performance

- Changing a style or a table no longer redraws the whole network (#864)

### App API

- `viewport.updateNodePositions` takes `{ recordUndo: true }` to make an app's move one
  undo entry. Positions are now validated: a value that is not `[x, y]` or `[x, y, z]`
  of finite numbers fails the call with `APP9` and moves no node (#876)

### Internal

The manual can be exported to the Read the Docs repository, so web-manual.cytoscape.org
can be generated from the in-app manual (#869, #891). Five other pull requests fixed a
flaky WebKit filter test (#823), completed the 1.1.0 changelog section and merged it back
into `development` (#824, #825), and set the version (#888, #906).

## [1.1.0] — 2026-10-14

Dark mode, several named visual styles per network, a FILTER tab ported from Cytoscape
Desktop, app installs from the App Store, an NDEx search bar, and local LLM models for
gene-set queries, on a build that loads faster and ships 25% less code.

### Breaking

- `?addserviceapp=` is removed; use `?installApp=` for both kinds of app (#657)
- App API: `apps-menu` entries are now plain data. Register with `onClick` instead of a
  component; old registrations fail with `APP9` (#707)
- App API: the deprecated `CyApp.components` field is removed. Register panels and menu
  items through `resources`; apps that declare only `components` load without them (#787)
- App API: calls that wrote invalid data now fail instead of succeeding silently — writes to
  missing elements, mistyped cell values, invalid visual property values, and duplicate or
  reserved column names (#586)

### Added

**Visual styles**

- Give a network several named visual styles and switch between them from the style
  picker (#656)
- Save a style to Workspace Styles and apply it to any network in the workspace (#656)
- Preset visual styles ship with the app (#656)
- Named styles are carried through CX2 import and export, so they survive a save to
  NDEx (#656)

**Mappings**

- Map a continuous mapping onto a discrete-valued visual property (#607)
- Apply a discrete node-shape mapping to list attributes (#607)
- Choose a sequential palette in the continuous color mapping form (#607)
- Opacity values in continuous mappings are shown as percentages (#607)
- Warn when an edge or border line type is not supported (#607)

**Appearance**

- Dark mode, following the operating system preference (#543)

**Layout**

- Apply the Biological Flow Layout, which arranges pathway networks left to right by
  signal flow (#559)
- Open Layout Tools from the Layout menu for a floating panel of layout controls (#606)
- Apply Default Layout from the Layout menu (#606)

**Networks and tables**

- Duplicate a network locally, without signing in (#606)
- Edit CX2 list values in a dedicated list editor, with paste and preview (#609)
- Column data types are shown in the Table Browser (#609)
- Node and edge ids are shown in the Table Browser (#606)
- Run Table Browser actions from a right-click context menu (#538)
- Create a self-loop edge from the node context menu (#673)
- Opaque CX2 aspects survive Merge Networks (#609)
- Paste bare base64 image bytes as a node image, without a `data:` prefix (#743)
- Show an image in each node: map a column of image URLs or base64 data onto Image/Chart 1
  with a passthrough mapping (#612)
- Image custom graphics are carried through CX2 import and export (#612)
- Cytoscape Web warns when exported content may not render in Cytoscape Desktop (#612)

**Filters**

- Filter nodes and edges from a FILTER tab in the left panel, ported from Cytoscape
  Desktop: column, degree and topology conditions in "Match all" or "Match any" groups (#814)
- A filter either selects the nodes and edges that pass, or shows only them (#814)
- Filters belong to the workspace and survive a reload (#814)
- Import and export Cytoscape Desktop filter files (#814)

**Search**

- Search NDEx from a search bar at the top of the Workspace tab (#691)
- Load from NDEx searches public and private networks in one list, with an "Only mine"
  filter and Load more for long result sets (#761)

**LLM Query**

- Run LLM Query against a local Ollama server or any OpenAI-compatible endpoint, set in
  Analysis ▸ LLM Query Options (#742)

**Hierarchy Viewer**

- List, boolean and missing values are shown in the property panel, and URLs and Ensembl
  ids are links (#797)
- The filter pane appears only when the network defines a filter, and its color swatches
  fade while the filter is off (#768, #800)

**Apps**

- Install apps from the App Store, or by URL (#552)
- Installed apps stay with the workspace and travel with it to and from NDEx (#552)
- Install either kind of app from a single, repeatable `?installApp=` link (#657)
- Deployments can opt in to installing apps from localhost (#677)

**Service apps**

- Refresh a service app in place, instead of removing and re-adding it (#608)
- Service apps can request no input data (#608)
- Service apps receive the NDEx access token and the current network's NDEx URL (#608)
- A service app's description appears at the top of its input dialog (#608)
- Service apps appear under the menu named by `cyWebMenuItem.root`, defaulting to
  Tools (#608)
- Service app column selectors list only columns of the required data type (#608)
- Layout and service app parameters show readable names, and column pickers offer a
  "(none)" choice (#746)

**Getting started and windows**

- Take a guided tour of the app, and relaunch it from Help ▸ Take a tour (#611)
- First run opens a welcome dialog introducing workspaces, networks, visual styles,
  tables and hierarchies (#611)
- Open sample networks, import a file, load from NDEx, or take the tour from an empty
  workspace (#718)
- Work in several tabs at once, with actions in one tab appearing in the others (#656)
- Navigate the menu bar with the keyboard (#712)
- Reset the local workspace from the startup error, instead of clearing IndexedDB by hand
  in DevTools (#649)

### Changed

- Dialogs now close only through their own buttons; clicking the backdrop or pressing Esc
  no longer dismisses them (#683)
- App messages now appear at the bottom center, so they no longer cover the network tabs (#783)
- The App Manager's Manifest Source editor is now behind an Advanced toggle (#725)
- The left panel's tab strip scrolls when its tabs do not fit (#814)
- In the NDEx browser, a shortcut whose network or folder is deleted or in the trash is
  disabled, and its tooltip says why (#820)
- The network view and the Cell View now stay centered when a panel or the window is
  resized (#750, #752)
- Hierarchy Viewer now rejects a malformed `filterWidgets` aspect instead of drawing a
  broken filter (#770)
- The interface is restyled for contrast and consistency: a darker toolbar, standardized
  dialog buttons, and one set of theme colors across every panel (#543)
- "Style Library" is now called "Workspace Styles" (#713)
- Switching visual styles is now undoable (#656)
- Every app install now asks for confirmation first (#657)
- The red "modified" dot is now a save button that shows the network's status (#606)
- The About box links the version to its release notes (#606)
- The disabled LLM query item now explains that it needs an HCX network (#606)
- The Cytoscape Desktop local-network permission is explained where it is requested (#606)
- Shape and line-type passthrough values from Cytoscape Desktop are normalized (#607)

### Fixed

- Fix issue where the app reloaded every time users switched tabs (#656)
- Fix issue where each tab did not stay on its own network across reloads (#656)
- Fix issue where a shared URL failed to load the network in some browsers (#656)
- Fix issue where a network imported from a file failed to load until the page was
  reloaded (#668)
- Fix issue where loading a CX2 file with empty node or edge attributes crashed (#609)
- Fix issue where a subnetwork query failed to run (#562)
- Fix issue where interconnect query results were not output as CX2 (#622)
- Fix issue where opening a network or folder shortcut in the NDEx browser loaded
  nothing (#581)
- Fix issue where network shortcuts inside an NDEx folder did not load, and every row in
  the folder showed 0 nodes and 0 edges (#818)
- Fix issue where networks inside an NDEx folder showed 0 nodes (#820)
- Fix issue where installing a newer version of an app left the old version running until
  the page was reloaded (#811)
- Fix issue where a discrete mapping on node fill color rendered as a pie chart (#565)
- Fix issue where the continuous mapping form crashed on an empty value (#623)
- Fix issue where the mapping attribute selection reverted to blank (#607)
- Fix issue where node labels did not render for networks with no visual properties (#607)
- Fix issue where items pasted into the list editor were dropped when Save was clicked
  from the Paste tab (#609)
- Fix issue where node and edge counts read one too high after creating an element (#674)
- Fix issue where annotations stayed fixed in place during zoom and pan (#678)
- Fix issue where toolbar menus needed two clicks to switch and never switched on
  hover (#710)
- Fix issue where clicking a subnetwork hung the filter panel (#631)
- Fix issue where hiding and revealing a panel crashed the layout (#698)
- Fix issue where the color palette list was clipped instead of scrolling (#664)
- Fix issue where the merge dialog's first-row tooltips overlapped (#606)
- Fix issue where app lists were cut off when many apps were installed (#608)
- Fix issue where Tree and Cell View tabs appeared for non-hierarchy networks (#606)
- Fix issue where a share URL from a hierarchy did not capture the subnetwork being
  shown (#606)
- Fix issue where Cell View was offered for hierarchies it cannot render (#643)
- Fix issue where Create Node stayed enabled with no network open (#587)
- Fix issue where App Manager offered Uninstall for built-in apps (#701)
- Fix issue where app-created columns vanished from the Table Browser after a reload (#686)
- Fix issue where edits made by apps left the network unmodified, so it was never saved to
  NDEx (#711)
- Fix issue where a service app's new columns did not appear in the Table Browser (#542)
- Fix issue where crash reports from web.cytoscape.org failed to send (#645)
- Fix issue where the guided tour skipped its canvas step (#694)
- Fix issue where a failed app showed no reason, and Retry was offered when it could not help (#720)
- Fix issue where an app manifest with a blank author, icon or repository could not be
  installed (#733)
- Fix issue where a service app form opened underneath its submenu, and closing the menu
  discarded the form (#747)
- Fix issue where a service app set to a built-in submenu, such as Data ▸ Import, appeared
  in a second submenu of the same name (#780)
- Fix issue where the Cell View was drawn off-center after switching to another network and
  back (#754)
- Fix issue where the Tree View was shifted after switching away and back (#779)
- Fix issue where the Hierarchy Viewer property panel was always empty (#757)
- Fix issue where a Hierarchy Viewer share URL pointed at the previous subsystem (#759)
- Fix issue where the Tree View and Sub Network Viewer fit buttons fit the wrong view (#763)
- Fix issue where disabling the Hierarchy Viewer filter left filtered elements hidden (#771)
- Fix issue where switching the Hierarchy Viewer filter attribute emptied the checkbox list (#800)
- Fix issue where a message never reappeared after closing the previous one with its X (#789)
- Fix issue where sample networks never loaded after Remove All Networks (#791)
- Fix issue where a network deleted by an app stayed in the URL, so the next network never
  loaded (#793)

### Performance

- Initial load is faster and the bundle is 25% smaller (#666, #633)
- The app now paints before the sign-in check, so it appears sooner (#604)

### App API

- BREAKING: `apps-menu` entries are now plain data. Register with `onClick` instead of a
  component; old registrations fail with `APP9` (#707)
- Apps can now persist per-network data across reloads (#687)
- Apps can now apply a whole visual style to a network, and read one back (#714)
- Apps can now list and switch a network's named visual styles (#714)
- Apps can now register their own network search provider (#691)
- Apps can now open dialogs styled by the host (#695)
- Apps can now receive `network:changed` for in-place topology edits (#671)
- Apps can now resolve the host origin at runtime (#655)
- Apps can now pass the full parameter set to `createContinuousMapping` (#576)
- BREAKING: `CyApp.components` is removed; use `resources` (#787)
- Apps can now register layout algorithms that run in the host's layout engine (#746)
- Apps can now open a side panel and select one of its tabs with `panel.open` (#748)
- Apps can now open the FILTER tab with `panel.open('left', 'filter')` (#814)
- Apps can now listen for `network:loaded`, which fires once a lazily loaded network's data
  is ready (#741)
- Apps can now read all edges with `getEdges`, read a table's columns with `getColumns`,
  and create a subnetwork from a node list (#586)
- Apps can now tell column additions and removals from row edits on `data:changed` (#586)
- Apps can now delete a network that was never shown (#795)
- Validation failures now carry a CX2 spec code in `error.cx2Code` (#586)
- The `createDiscreteMapping` documentation now describes its `mapping` parameter (#566)

### Internal

The build moved from webpack to Vite 8 and TypeScript 7 (#739). The other 42 internal
pull requests covered test coverage and quiet test runners, strict TypeScript, CI
workflows (#544), the `@cytoscape-web/api-types` beta.4 release and its publish check
(#726, #804), contributor documentation, and the agent tooling in `.claude/`.

## [1.0.8] — 2026-07-07

### Added

- Menu items show icons, and the Help menu gains About and License entries. The License menu moves into Help, and Code Repository moves to Help > Developer. (#537)
- The app registry lists the deployed example apps, Network Workflows and Network Statistics, so they can be installed from the production build.

### Changed

- Menus share the app theme's colors and use consistent separators, and some menus close when they open a dialog. (#537)

### Fixed

- Columns that a service app adds now appear in the Table Browser. (#570)
- Hierarchy Viewer loads subnetworks again; the NDEx interconnect query failed with "parameters.split is not a function" and then returned a format the viewer could not read (#557).
- A discrete mapping on node fill color no longer draws an empty pie or ring chart when the chart has no data columns (#550).
