import * as NetworkFn from '../newModels/Network/network-functions'
import { Network } from '../newModels/Network'

import {Cytoscape} from 'cytoscape'


test('create an empty network', () => {

   const cy = new Cytoscape({
      headless: true
    })
  expect(cy).toBeDefined()

  const net1: Network = NetworkFn.createNetwork('test')
  expect(net1).toBeDefined()
  expect(net1.id).toBe('test')
});