import { faker } from '@faker-js/faker'
import { Workspace, CurrentNetwork, NetworkSummary } from '../src/models'
import { Row } from '../src/models/Table'
import { VisualStyle } from '../src/models/Style'
import _ from 'lodash'

const emptyRow = (): Row => {
  return {
    key: '0',
    data: {},
  }
}

const createRandomNetworkSummary = (): NetworkSummary => {
  return {
    uuid: faker.datatype.uuid(),
    name: `${faker.hacker.noun()} network`,
    iconUrl: faker.image.abstract(),
    attributes: emptyRow(),
    createdAt: faker.date.past().toString(),
    modifiedAt: faker.date.recent().toString(),
  }
}

const createRandomWorkspace = (numNetworks: number): Workspace => {
  const networkSummaries = _.times(numNetworks, () =>
    createRandomNetworkSummary(),
  )
  return {
    uuid: faker.datatype.uuid(),
    name: `${faker.name.fullName()}'s workspace ${faker.datatype.number()}`,
    networkSummaries,
    currentNetworkUUID:
      networkSummaries[faker.datatype.number(networkSummaries.length - 1)].uuid,
  }
}

const createRandomVisualStyle = (): VisualStyle => {}

const createRandomNetwork = (
  networkSummary: NetworkSummary,
): CurrentNetwork => {
  return {
    summary: networkSummary,
    visualStyle: createRandomVisualStyle(),
    networkView: createRandomNetworkView(),
    edgeTable: emptyTable(),
    nodeTable: emptyTable(),
    network: createRandomNetworkModel(),
  }
}
