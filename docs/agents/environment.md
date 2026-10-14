# Environment Reference

> Detail split out of `AGENTS.md` §5 so the always-loaded file stays small.
> Build system, runtime configuration files, and repo scripts.

### Build System

Vite 8 with the Module Federation Vite plugin provides the microfrontend build:

- Module Federation exposed modules are defined in `src/app-api/federation/federationExposes.ts` and wired into `vite.config.ts`.
- Shared singletons: react, react-dom, @mui/material
- Vite's `define` option injects git commit hash and timestamps at build time
- Production builds strip direct `console.*()` calls through Vite's Oxc minifier configuration

### Important Files & Configuration

| File                      | Purpose                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/assets/config.json`  | Runtime configuration: NDEx server URL, thresholds (`maxNetworkElementsThreshold: 26000`, `maxEdgeCountThreshold: 20000`, `maxNetworkFileSize: 500MB`), Keycloak auth, Google Analytics |
| `src/assets/apps.json`    | External Module Federation app definitions                                                                                                                                              |
| `src/debug.ts`            | Structured logging system (debug package)                                                                                                                                               |
| `src/AppConfigContext.ts` | React context for runtime app configuration                                                                                                                                             |
| `src/custom.d.ts`         | Global TypeScript type declarations                                                                                                                                                     |
| `src/boot/`               | The entire startup path — boot shell, phase orchestrator, instrumentation. See `src/boot/boot_docs/boot.md`                                                                              |
| `src/boot/bootstrap.tsx`  | Boot entry (calls `enableMapSet()`, sets up logging, renders)                                                                                                                            |

**Environment variables:** The `.env` file exists but is unused. Build-time metadata is injected through Vite's `define` option.

### Scripts

| Script                                       | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `scripts/generate-test-fixtures/`            | Generate CX2, SIF, table, and URL test fixtures |
| `scripts/generate-model-diagram/`            | Generate Mermaid diagrams of model dependencies |
| `scripts/generate-state-diagram/`            | Generate state structure diagrams               |
| `scripts/download-ndex-networks.ts`          | Download networks from NDEx for testing         |
| `scripts/manual-database-snapshot-export.js` | Export IndexedDB snapshots                      |
| `scripts/batch-renaming/`                    | CSV-based batch file renaming with git-mv       |

---
