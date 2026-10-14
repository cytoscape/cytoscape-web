# Changelog

All notable changes to Cytoscape Web are documented here.

## [1.1.0] — 2026-10-05

Dark mode, several named visual styles per network, app installs from the App Store,
an NDEx search bar, and local LLM models for gene-set queries, on a build that loads faster and ships 25% less code.

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
- Use images as node custom graphics, by URL or local upload (#612)
- Image custom graphics are carried through CX2 import and export (#612)
- Cytoscape Web warns when exported content may not render in Cytoscape Desktop (#612)

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
- Apps can now listen for `network:loaded`, which fires once a lazily loaded network's data
  is ready (#741)
- Apps can now read all edges with `getEdges`, read a table's columns with `getColumns`,
  and create a subnetwork from a node list (#586)
- Apps can now tell column additions and removals from row edits on `data:changed` (#586)
- Apps can now delete a network that was never shown (#795)
- Validation failures now carry a CX2 spec code in `error.cx2Code` (#586)
- The `createDiscreteMapping` documentation now describes its `mapping` parameter (#566)

### Internal

The build moved from webpack to Vite 8 and TypeScript 7 (#739). The other 41 internal
pull requests covered test coverage and quiet test runners, strict TypeScript, CI
workflows (#544), the `@cytoscape-web/api-types` beta.4 release (#726), contributor
documentation, and the agent tooling in `.claude/`.

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
