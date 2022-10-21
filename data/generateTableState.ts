import path from 'path'
import fs from 'fs'
import { faker } from '@faker-js/faker'

const NUM_ROWS = 100_000

const columns = [
  {
    id: 'a',
    title: 'attributeA',
  },
  {
    id: 'b',
    title: 'attributeB',
  },
  {
    id: 'c',
    title: 'attributeC',
  },
]
const rows = []

for (let i = 0; i < NUM_ROWS; i++) {
  rows.push({
    attributeA: faker.random.word(),
    attributeB: faker.random.word(),
    attributeC: faker.random.word(),
  })
}

const fileData = JSON.stringify({ rows, columns }, null, 2)

fs.writeFile(
  path.join(process.cwd(), 'data', `${NUM_ROWS}Rows.json`),
  fileData,
  (err) => {
    if (err) {
      console.error(err)
      return
    }
    console.log('table data generated')
  },
)
