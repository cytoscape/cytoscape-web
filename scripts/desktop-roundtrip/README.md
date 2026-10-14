# Cytoscape Desktop CX2 round-trip harness

Verify how Cytoscape Desktop's CX2 importer handles networks exported by Cytoscape Web —
without going through the app UI. Useful for diagnosing custom-graphics (and other)
export-compatibility issues.

## Requirements

- Cytoscape Desktop **3.6+** running, with the CyREST app (bundled by default) on port
  `1234`. Confirm with the `check` command below.
- Node 18+ (uses global `fetch`). No repo dependencies — the script is standalone.

## How it maps to the app

This reproduces exactly what "Open Network in Cytoscape Desktop" does in Cytoscape Web
(`src/data/hooks/useOpenInCytoscapeDesktop.ts` → `CyNDEx.postCX2NetworkToCytoscape`):

```http
POST http://127.0.0.1:1234/v1/networks?format=cx2&title=<n>&collection=<n>
Content-Type: application/json
body: <raw CX2 JSON string>
```

## Commands

```bash
# Is Desktop reachable? (prints the Cytoscape version)
node scripts/desktop-roundtrip/desktop-cx2-roundtrip.mjs check

# Import a CX2 file (as Cytoscape Web would). Prints the new network SUID or the
# Desktop error payload on failure.
node scripts/desktop-roundtrip/desktop-cx2-roundtrip.mjs post <file.cx2> ["Network name"]

# Post a base file plus single-variable mutations (size type, passthrough type) to
# isolate which CX2 shapes Desktop's importer rejects.
node scripts/desktop-roundtrip/desktop-cx2-roundtrip.mjs probe <baseFile.cx2>

# Read back a network Desktop currently holds (note: Desktop returns Cytoscape.js JSON
# for GET regardless of format=cx2).
node scripts/desktop-roundtrip/desktop-cx2-roundtrip.mjs readback <suid> [out.json]
```

Override the endpoint with `CYREST_URL` (e.g. `CYREST_URL=http://127.0.0.1:1235`).

## What it can and cannot tell you

- ✅ **Import-time failures** (crashes): a non-2xx response with Desktop's error payload
  (e.g. `ClassCastException`, `NullPointerException`, malformed-mapping errors).
- ❌ **Render-time failures** like the "?" broken-image placeholder: these happen after
  the network model is built and are **not** visible in the POST response. After
  importing, look at the network in Desktop to check whether custom-graphic images render
  or show "?".

## Known custom-graphics findings (as of the `custom-graphics-rebased` audit)

- Cytoscape Web's export imports into Desktop 3.10.3 **without crashing** (size stringified
  as `"50.0"`, `tag`/`id` injected — all accepted).
- **No URL scheme renders from a CX2 import in a fresh Desktop session.** Desktop loads
  custom-graphic image bytes from its session `CustomGraphicsManager` pool, not from the
  network file; a CX2 import keeps only the reference (`class`, `id`, `name`, `tag`) and never
  fetches `properties.url` — for `http`, `https`, `data`, or `file` alike. All of them show
  "?". Verified by rendering imported views via
  `GET /v1/networks/{suid}/views/{viewSuid}.png`. (`data:` URIs and inline SVG additionally
  have no Java URL handler, but switching to a hosted `http(s)` URL does **not** fix the
  placeholder — there is no "preferred" scheme here.) Only a Desktop-side app that pools the
  images itself (e.g. stringApp) makes them appear.
- SVG images must use Desktop's SVG factory class
  (`org.cytoscape.ding.customgraphics.image.SVGCustomGraphics`), not the bitmap class.
