import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { enableMapSet } from 'immer'

// Enable Immer's MapSet plugin to support Map and Set in Immer
enableMapSet()

jest.setTimeout(100000)
