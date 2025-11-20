/**
 * Tests for database snapshot import/export functionality
 */

import {
  exportDatabaseSnapshot,
  exportDatabaseSnapshotToFile,
  importDatabaseSnapshot,
  importDatabaseSnapshotFromFile,
} from './index'
import {
  MAX_SNAPSHOT_SIZE_BYTES,
  MAX_RECORDS_PER_STORE,
  sanitizeRecord,
  validateSnapshotFile,
  validateSnapshotStructure,
} from './snapshotValidator'
import {
  clearNetworksFromDb,
  closeDb,
  deleteDb,
  getNetworkFromDb,
  initializeDb,
  ObjectStoreNames,
  putNetworkToDb,
  putTablesToDb,
} from '../index'
import { Network } from '../../../models/NetworkModel'
import { Table } from '../../../models/TableModel'

describe('Database Snapshot Import/Export', () => {
  beforeEach(async () => {
    await deleteDb()
    await initializeDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  describe('exportDatabaseSnapshot', () => {
    it('should export an empty database', async () => {
      const snapshotJson = await exportDatabaseSnapshot()
      const snapshot = JSON.parse(snapshotJson)

      expect(snapshot.metadata).toBeDefined()
      expect(snapshot.metadata.version).toBeGreaterThan(0)
      expect(snapshot.metadata.exportDate).toBeDefined()
      expect(snapshot.metadata.exportVersion).toBeDefined()
      // buildId and buildDate are optional (only present if env vars are set)
      expect(snapshot.data).toBeDefined()
    })

    it('should export database with data', async () => {
      // Add test data
      const testNetwork: Network = {
        id: 'test-network-1',
        nodes: [{ id: 'node1' }, { id: 'node2' }],
        edges: [{ id: 'edge1', s: 'node1', t: 'node2' }],
      }

      const testNodeTable: Table = {
        id: 'test-network-1-nodes',
        columns: [],
        rows: new Map(),
      }

      const testEdgeTable: Table = {
        id: 'test-network-1-edges',
        columns: [],
        rows: new Map(),
      }

      await putNetworkToDb(testNetwork)
      await putTablesToDb('test-network-1', testNodeTable, testEdgeTable)

      const snapshotJson = await exportDatabaseSnapshot()
      const snapshot = JSON.parse(snapshotJson)

      expect(snapshot.data[ObjectStoreNames.CyNetworks]).toBeDefined()
      expect(
        snapshot.data[ObjectStoreNames.CyNetworks]?.length,
      ).toBeGreaterThan(0)
      expect(snapshot.data[ObjectStoreNames.CyTables]).toBeDefined()
    })

    it('should include all object stores in export', async () => {
      const snapshotJson = await exportDatabaseSnapshot()
      const snapshot = JSON.parse(snapshotJson)

      const expectedStores = Object.values(ObjectStoreNames)
      for (const storeName of expectedStores) {
        expect(snapshot.data).toHaveProperty(storeName)
        expect(Array.isArray(snapshot.data[storeName])).toBe(true)
      }
    })
  })

  describe('importDatabaseSnapshot', () => {
    it('should import a valid snapshot', async () => {
      // Create a test snapshot
      const testNetwork: Network = {
        id: 'import-test-1',
        nodes: [{ id: 'n1' }, { id: 'n2' }],
        edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
      }

      await putNetworkToDb(testNetwork)

      const snapshotJson = await exportDatabaseSnapshot()
      await clearNetworksFromDb()

      const result = await importDatabaseSnapshot(snapshotJson)

      expect(result.success).toBe(true)
      expect(
        result.importedCounts[ObjectStoreNames.CyNetworks],
      ).toBeGreaterThan(0)

      const imported = await getNetworkFromDb('import-test-1')
      expect(imported).toBeDefined()
      expect(imported?.id).toBe('import-test-1')
    })

    it('should reject invalid JSON', async () => {
      await expect(importDatabaseSnapshot('invalid json {')).rejects.toThrow(
        'Invalid JSON format',
      )
    })

    it('should reject snapshot without metadata', async () => {
      const invalidSnapshot = JSON.stringify({ data: {} })

      await expect(importDatabaseSnapshot(invalidSnapshot)).rejects.toThrow(
        'Snapshot validation failed',
      )
    })

    it('should reject snapshot without data', async () => {
      const invalidSnapshot = JSON.stringify({
        metadata: {
          version: 7,
          exportDate: new Date().toISOString(),
          exportVersion: '1.0.0',
        },
      })

      await expect(importDatabaseSnapshot(invalidSnapshot)).rejects.toThrow(
        'Snapshot validation failed',
      )
    })

    it('should reject snapshot with invalid version', async () => {
      const invalidSnapshot = JSON.stringify({
        metadata: {
          version: 'not-a-number',
          exportDate: new Date().toISOString(),
          exportVersion: '1.0.0',
        },
        data: {},
      })

      await expect(importDatabaseSnapshot(invalidSnapshot)).rejects.toThrow(
        'Snapshot validation failed',
      )
    })

    it('should reject snapshot exceeding size limit', async () => {
      const largeString = 'x'.repeat(MAX_SNAPSHOT_SIZE_BYTES + 1)
      const invalidSnapshot = JSON.stringify({
        metadata: {
          version: 7,
          exportDate: new Date().toISOString(),
          exportVersion: '1.0.0',
        },
        data: { largeData: largeString },
      })

      await expect(importDatabaseSnapshot(invalidSnapshot)).rejects.toThrow(
        'exceeds maximum allowed size',
      )
    })

    it('should handle merge mode', async () => {
      // Create initial data
      const network1: Network = {
        id: 'merge-test-1',
        nodes: [{ id: 'n1' }],
        edges: [],
      }
      await putNetworkToDb(network1)

      // Create snapshot with additional data
      const network2: Network = {
        id: 'merge-test-2',
        nodes: [{ id: 'n2' }],
        edges: [],
      }
      const snapshotJson = await exportDatabaseSnapshot()
      await putNetworkToDb(network2)

      // Import with merge
      const result = await importDatabaseSnapshot(snapshotJson, { merge: true })

      expect(result.success).toBe(true)
      // Both networks should exist
      const net1 = await getNetworkFromDb('merge-test-1')
      const net2 = await getNetworkFromDb('merge-test-2')
      expect(net1).toBeDefined()
      expect(net2).toBeDefined()
    })

    it('should handle skipConflicts mode', async () => {
      // Create initial data
      const network1: Network = {
        id: 'skip-test-1',
        nodes: [{ id: 'n1' }],
        edges: [],
      }
      await putNetworkToDb(network1)

      // Create snapshot with same ID
      const snapshotJson = await exportDatabaseSnapshot()

      // Import with skipConflicts
      const result = await importDatabaseSnapshot(snapshotJson, {
        merge: true,
        skipConflicts: true,
      })

      expect(result.success).toBe(true)
      if (result.skippedCounts) {
        expect(
          result.skippedCounts[ObjectStoreNames.CyNetworks] || 0,
        ).toBeGreaterThan(0)
      }
    })
  })

  describe('validateSnapshotStructure', () => {
    it('should validate a correct snapshot structure', () => {
      const snapshot = {
        metadata: {
          version: 7,
          exportDate: new Date().toISOString(),
          exportVersion: '1.0.0',
        },
        data: {
          [ObjectStoreNames.CyNetworks]: [],
          [ObjectStoreNames.CyTables]: [],
        },
      }

      const result = validateSnapshotStructure(snapshot, 7)
      expect(result.isValid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should reject snapshot with missing metadata', () => {
      const snapshot = { data: {} }
      const result = validateSnapshotStructure(snapshot, 7)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject snapshot with invalid version', () => {
      const snapshot = {
        metadata: {
          version: 'invalid',
          exportDate: new Date().toISOString(),
          exportVersion: '1.0.0',
        },
        data: {},
      }
      const result = validateSnapshotStructure(snapshot, 7)
      expect(result.isValid).toBe(false)
    })

    it('should warn about newer version', () => {
      const snapshot = {
        metadata: {
          version: 8,
          exportDate: new Date().toISOString(),
          exportVersion: '1.0.0',
        },
        data: {},
      }
      const result = validateSnapshotStructure(snapshot, 7)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should reject non-array data in object stores', () => {
      const snapshot = {
        metadata: {
          version: 7,
          exportDate: new Date().toISOString(),
          exportVersion: '1.0.0',
        },
        data: {
          [ObjectStoreNames.CyNetworks]: 'not-an-array',
        },
      }
      const result = validateSnapshotStructure(snapshot, 7)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateSnapshotFile', () => {
    it('should validate a valid file', () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' })
      const result = validateSnapshotFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should reject file exceeding size limit', () => {
      const largeContent = 'x'.repeat(MAX_SNAPSHOT_SIZE_BYTES + 1)
      const file = new File([largeContent], 'test.json', {
        type: 'application/json',
      })
      const result = validateSnapshotFile(file)
      expect(result.isValid).toBe(false)
    })

    it('should warn about non-json extension', () => {
      const file = new File(['{}'], 'test.txt', { type: 'application/json' })
      const result = validateSnapshotFile(file)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('sanitizeRecord', () => {
    it('should sanitize normal records', () => {
      const record = { id: 'test', name: 'Test', value: 123 }
      const sanitized = sanitizeRecord(record)
      expect(sanitized).toEqual(record)
    })

    it('should remove dangerous keys', () => {
      const record = {
        id: 'test',
        __proto__: { polluted: true },
        constructor: {},
      }
      const sanitized = sanitizeRecord(record)
      // Check that dangerous keys are not present as own properties
      expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(
        false,
      )
      expect(
        Object.prototype.hasOwnProperty.call(sanitized, 'constructor'),
      ).toBe(false)
      // Verify safe keys are still present
      expect(sanitized.id).toBe('test')
    })

    it('should sanitize nested objects', () => {
      const record = {
        id: 'test',
        nested: {
          __proto__: { polluted: true },
          value: 'safe',
        },
      }
      const sanitized = sanitizeRecord(record)
      expect(sanitized.nested.value).toBe('safe')
      // Check that dangerous keys are not present as own properties in nested object
      expect(
        Object.prototype.hasOwnProperty.call(sanitized.nested, '__proto__'),
      ).toBe(false)
    })

    it('should handle arrays', () => {
      const record = {
        id: 'test',
        items: [{ value: 1 }, { value: 2 }],
      }
      const sanitized = sanitizeRecord(record)
      expect(Array.isArray(sanitized.items)).toBe(true)
      expect(sanitized.items.length).toBe(2)
    })
  })
})
