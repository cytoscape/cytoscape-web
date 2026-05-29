# Cytoscape Web App Install Integration Options

## Context

The App Store needs a way to add a selected Web App to Cytoscape Web’s runtime app catalog, alongside apps loaded from `apps.json` or the official Store manifest.

The app should be added to the available app catalog first. It should only be loaded and executed when the user explicitly enables it in Cytoscape Web.

## Option 1: `postMessage` Bridge

The App Store runs as a separate web app and sends an install request to an already-open Cytoscape Web window using `window.postMessage`.

### Pros

- Supports immediate install into an already-open Cytoscape Web session.
- Does not require page reload or URL navigation.
- Works well when the App Store opens Cytoscape Web as a popup or keeps a window reference.
- Allows structured request/response handling with `requestId` and `ApiResult`.
- Keeps large app metadata out of URLs and browser history.

### Cons

- Requires careful origin allowlisting.
- Requires coordination between two browser windows or tabs.
- Harder to use from a plain hyperlink.
- Needs a new message contract and bridge listener in Cytoscape Web.

## Option 2: URL Parameter Install Intent

The App Store redirects or links to Cytoscape Web with an install parameter, such as:

`?installAppManifest=https%3A%2F%2Fapps.cytoscape.org%2Fweb%2Fhello%2Fmanifest.json`

Cytoscape Web consumes the parameter during startup or route initialization, validates the app entry, adds it to the in-memory catalog, and then removes the parameter from the URL.

### Pros

- Simple to launch from any link or button.
- Works without cross-window messaging.
- Fits Cytoscape Web’s existing URL-as-initial-state pattern.
- Easy to test manually by opening a URL.
- Good for cold-start flows where Cytoscape Web is not already open.

### Cons

- Best suited for startup/navigation, not instant updates to an existing session.
- Full app metadata should not be embedded directly in the URL due to length and exposure risks.
- Install intent can appear in browser history, logs, or referrers unless cleaned quickly.
- Requires new query parameter parsing in `AppShell`.
- Re-trigger behavior must be handled carefully because Cytoscape Web consumes search params on load.

## Option 3: Manifest Update

The App Store updates a manifest endpoint after the user clicks Install. Cytoscape Web then picks up the change by refreshing its catalog or by loading the manifest on the next startup.

This can be either:

- a global public manifest of all approved Web Apps; or
- a user-specific manifest containing only the user’s installed apps.

### Pros

- Aligns closely with the existing Cytoscape Web manifest pipeline.
- Requires the least new host-side communication logic.
- Keeps the App Store backend as the source of truth.
- Works well for persistent installs across sessions.
- Makes app removal, unpublishing, and version updates easier to centralize.
- Avoids passing app metadata through browser URLs or cross-window messages.

### Cons

- Not immediate unless Cytoscape Web refreshes the catalog.
- Requires App Store backend support for install state.
- User-specific manifests require authentication, CORS, and cache-control design.
- A global manifest update is publication, not per-user installation.
- Browser or CDN caching can delay visibility unless handled carefully.
- Less suitable when the user expects an already-open Cytoscape Web session to update instantly.

## Shared Host-Side Needs

All options require Cytoscape Web to support validated runtime catalog updates:

- Validate entries using the existing manifest validation rules.
- Avoid executing remote code during install.
- Use the existing `activateApp(id)` flow when the user enables the app.
- Keep loaded apps running when the catalog changes.

Options 1 and 2 also benefit from session-only catalog overlays:

- Add an AppStore action such as `installCatalogEntry(entry)`.
- Merge installed entries with the manifest-derived catalog.
- Preserve session-installed entries when the manifest catalog refreshes.

Option 3 can mostly reuse the existing manifest refresh flow:

- App Store updates the manifest endpoint.
- Cytoscape Web calls `refreshCatalog()` or reloads.
- The updated manifest becomes the available app list.

## Summary

| Criteria                       | `postMessage` Bridge         | URL Parameter                | Manifest Update                   |
| ------------------------------ | ---------------------------- | ---------------------------- | --------------------------------- |
| Existing Cytoscape Web session | Strong                       | Weak                         | Moderate with refresh             |
| Cold-start from App Store link | Moderate                     | Strong                       | Strong                            |
| Implementation simplicity      | Moderate                     | Strong                       | Strong on host, higher on backend |
| Persistent install state       | Weak unless added separately | Weak unless added separately | Strong                            |
| Security complexity            | Origin validation            | URL validation               | Auth, CORS, cache policy          |
| Large metadata support         | Strong                       | Weak                         | Strong                            |
| Manual testing                 | Moderate                     | Strong                       | Strong                            |
| Backend requirements           | Low                          | Low to moderate              | High                              |
| Best use case                  | Live install into open host  | Link-based install intent    | Persistent Store-owned catalog    |

## Recommendation

Use the Manifest Update approach when installs should be persistent and Store-owned.

Use the URL Parameter approach for simple launch/install flows.

Use the `postMessage` bridge when the App Store needs to update an already-open Cytoscape Web session without navigation.
