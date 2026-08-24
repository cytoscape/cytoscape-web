// @vitest-environment node
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  FEDERATION_EXPOSES,
  FEDERATION_FILENAME,
  FEDERATION_NAME,
} from './federationExposes'

// Frozen, human-reviewed list of the public Module Federation surface.
// A diff to the exposed modules MUST be matched by a deliberate edit here.
const EXPECTED_EXPOSE_KEYS = [
  './ApiTypes',
  './ElementApi',
  './NetworkApi',
  './SelectionApi',
  './ViewportApi',
  './TableApi',
  './VisualStyleApi',
  './LayoutApi',
  './ExportApi',
  './WorkspaceApi',
  './ScopedApi',
  './AppIdContext',
  './EventBus',
  './CredentialStore',
  './LayoutStore',
  './MessageStore',
  './NetworkStore',
  './NetworkSummaryStore',
  './OpaqueAspectStore',
  './RendererStore',
  './TableStore',
  './UiStateStore',
  './ViewModelStore',
  './VisualStyleStore',
  './WorkspaceStore',
  './CreateNetwork',
  './CreateNetworkFromCx2',
]

// repo root, relative to this file (src/app-api/federation/)
const REPO_ROOT = path.resolve(__dirname, '../../../')

describe('Module Federation exposes contract', () => {
  it('exposes exactly the expected public surface (set equality)', () => {
    expect(new Set(Object.keys(FEDERATION_EXPOSES))).toEqual(
      new Set(EXPECTED_EXPOSE_KEYS),
    )
  })

  it('maps every expose to a source file that exists on disk', () => {
    for (const target of Object.values(FEDERATION_EXPOSES)) {
      const abs = path.resolve(REPO_ROOT, target)
      expect(fs.existsSync(abs), `missing expose target: ${target}`).toBe(true)
    }
  })

  it('keeps the container identity stable', () => {
    // Plugins hard-code the `cyweb` scope and load `remoteEntry.js`;
    // a rename silently breaks every deployed app.
    expect(FEDERATION_NAME).toBe('cyweb')
    expect(FEDERATION_FILENAME).toBe('remoteEntry.js')
  })
})
