import { faker } from '@faker-js/faker'
import { Workspace, CurrentNetwork, NetworkSummary } from '../src/models'

// const createRandomRow = (key: IdType): Row => {
//     return {
//         key,

//     }

// }

const createRandomNetworkSummary = (): NetworkSummary => {
  return {
    uuid: faker.datatype.uuid(),
    name: `${faker.hacker.noun()} network`,
    iconUrl: faker.image.abstract(),
    attributes: { key: '0', data: {} },
    createdAt: faker.date.past().toString(),
    modifiedAt: faker.date.recent().toString(),
  }
}

const createRandomWorkspace = (): Workspace => {
  return {
    uuid: faker.datatype.uuid(),
    name: `${faker.name.fullName()}'s workspace ${faker.datatype.number()}`,
    networkSummaries: [],
    currentNetworkUUID: faker.datatype.uuid(),
  }
}
