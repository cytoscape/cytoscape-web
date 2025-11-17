#!/usr/bin/env ts-node
/**
 * Script to download NDEx networks as CX2 files
 * Usage: ts-node scripts/download-ndex-networks.ts <uuid1> <uuid2> ...
 */

import { writeFileSync } from 'fs'
import { join } from 'path'
import { fetchNdexNetwork } from '../src/api/ndex/network'

const OUTPUT_DIR = join(__dirname, '../test/fixtures/ndex')

async function downloadNetwork(uuid: string): Promise<void> {
  try {
    console.log(`Downloading network ${uuid}...`)
    const network = await fetchNdexNetwork(uuid, undefined, 'dev1.ndexbio.org')
    
    const filename = `${uuid}.valid.cx2`
    const filepath = join(OUTPUT_DIR, filename)
    
    writeFileSync(filepath, JSON.stringify(network, null, 2))
    console.log(`✓ Saved to ${filename}`)
  } catch (error) {
    console.error(`✗ Failed to download ${uuid}:`, error instanceof Error ? error.message : error)
  }
}

async function main() {
  const uuids = process.argv.slice(2)
  
  if (uuids.length === 0) {
    console.error('Usage: ts-node scripts/download-ndex-networks.ts <uuid1> <uuid2> ...')
    process.exit(1)
  }
  
  for (const uuid of uuids) {
    await downloadNetwork(uuid)
  }
}

main().catch(console.error)

