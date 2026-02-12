# Multi Scale Viewer API

This is the working document for designing the API functions in CyWeb. High priority functions that are needed to support Cecile's multi-scale-pathway-viewer app are highlighted as yellow

1. App lifecycle functions
   1. mount(context) Called **when the app is initialized and attached to Cytoscape Web**. Use `mount()` to:
      1. Create and render UI elements
      2. Register event listeners
      3. Initialize app state
   2. unmount(): Called **when the app is uninstalled, deactivated**. Apps must not leave behind DOM nodes, listeners, or background work after this method completes. Use unmout() to:
      1. Remove UI elements from the DOM
      2. Unregister event listeners
      3. Cancel timers, observers, or async tasks
      4. Release any allocated resources

      Notes: `unmount()` _will always be called_ (even on reload)? No async work should survive past `unmount().`

2. Network
   1. Load a network to workspace
   2. Remove a network from workspace  

3. Context menu.
   1. Add a menu item. Eg. Add a menu item called (Expand pathway) and it should trigger a function
   2. Remove a menu item.
4. Nodes
   1. Add a node, with attributes and coordinates, and bypass visual properties optionally
   2. Remove a node by id
   3. Get a node by Id, return its attributes and coordinates
   4. Get node attributes by Id, return attributes on that node
   5. Get node coordinates by id, return coordinates of that node
5. Edges
   1. Add an edge between 2 nodes, with attributes and bypass visual properties optionally
   2. Remove an edge by id.
   3. Move an edge by id to a new pair of nodes, a shortcut of remove and add, with the edge id and all attributes, bypass visual properties preserved.
   4. Get Edge by id, return the source and target node Id and attributes on it.
