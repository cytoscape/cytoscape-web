/**
 * Test data for the HierarchyViewer subnetwork E2E acceptance test.
 *
 * These values are specific to a particular hierarchy network on a particular
 * NDEx server. The server itself comes from `src/assets/config.json`
 * (`ndexBaseUrl` + `urlBaseName`); the values below identify the network and the
 * subsystem within it, plus the expected result.
 *
 * ── Adding more cases ────────────────────────────────────────────────────────
 * The spec (`hierarchy-subnetwork.spec.ts`) loops over `hierarchySubnetworkCases`
 * and generates one `test(...)` per entry. To add a case, append an object to
 * that array (see the commented template). No spec changes are needed.
 *
 * ── Retargeting the default case ─────────────────────────────────────────────
 * The first case is overridable at runtime via environment variables, so you can
 * point the test at a different server/network without editing this file — e.g.:
 *
 *   E2E_HIERARCHY_UUID=<uuid> \
 *   E2E_SUBSYSTEM_CX_ID=<id> \
 *   E2E_SUBSYSTEM_NAME="<name>" \
 *   E2E_EXPECTED_NODE_COUNT=<n> \
 *   RUN_NDEX_E2E=1 npx playwright test hierarchy-subnetwork.spec.ts
 */

/**
 * Parse a positive-integer env override, failing loudly on garbage. Without
 * this, `E2E_EXPECTED_NODE_COUNT=abc` would silently become `NaN` and surface
 * as a baffling "expected NaN" assertion far from the real cause (a bad env).
 */
function parseCount(envVar: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined) {
    return fallback
  }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(
      `${envVar} must be a non-negative integer, got "${raw}".`,
    )
  }
  return n
}

export interface HierarchySubnetworkCase {
  /** Human-readable label used in the test title. */
  name: string
  /** NDEx UUID of the hierarchy (HCX) network to load. */
  uuid: string
  /** CX id of the subsystem hierarchy node to click. */
  subsystemCxId: string
  /** Display name of that subsystem (shown in the sub network viewer pane). */
  subsystemName: string
  /** The "Number of proteins" column name on hierarchy nodes. */
  numberOfProteinsColumn: string
  /** Expected node count returned by the interconnect query for the subsystem. */
  expectedNodeCount: number
}

/**
 * Default case: the music1 "Multi-Scale Integrated Cell (MuSIC) v1" network on
 * dev1.ndexbio.org, subsystem "RNA processing complex 2" (6 proteins).
 * Fields are env-overridable so this case can be retargeted without edits.
 */
const musicRnaProcessingCase: HierarchySubnetworkCase = {
  name: process.env.E2E_CASE_NAME ?? 'music1 / RNA processing complex 2',
  uuid: process.env.E2E_HIERARCHY_UUID ?? '1366ba85-9acc-11ef-9702-005056ae6f73',
  subsystemCxId: process.env.E2E_SUBSYSTEM_CX_ID ?? '124',
  subsystemName: process.env.E2E_SUBSYSTEM_NAME ?? 'RNA processing complex 2',
  numberOfProteinsColumn:
    process.env.E2E_NUMBER_OF_PROTEINS_COLUMN ?? 'Number of proteins',
  expectedNodeCount: parseCount(
    'E2E_EXPECTED_NODE_COUNT',
    process.env.E2E_EXPECTED_NODE_COUNT,
    6,
  ),
}

/**
 * All hierarchy-subnetwork cases to run. Each becomes its own test.
 * Add more like this (ids/counts must match the server in config.json):
 *
 *   {
 *     name: 'music1 / Ribosome',
 *     uuid: '1366ba85-9acc-11ef-9702-005056ae6f73',
 *     subsystemCxId: '<cx id>',
 *     subsystemName: '<subsystem name>',
 *     numberOfProteinsColumn: 'Number of proteins',
 *     expectedNodeCount: <n>,
 *   },
 */
export const hierarchySubnetworkCases: HierarchySubnetworkCase[] = [
  musicRnaProcessingCase,
]

/**
 * Whether to run the live-NDEx E2E acceptance tests. These hit a real NDEx
 * server, so they are opt-in: they only run when RUN_NDEX_E2E is set (any
 * non-empty value). Keeps the default/unit CI lane hermetic and fast.
 */
export const runNdexE2E = Boolean(process.env.RUN_NDEX_E2E)
