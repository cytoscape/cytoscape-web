import { test as base, expect } from '@playwright/test'

type Fixtures = {}

export const test = base.extend<Fixtures>({})
export { expect }
