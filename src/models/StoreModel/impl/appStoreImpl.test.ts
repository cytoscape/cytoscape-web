import { AppStatus } from '../../AppModel/AppStatus'
import { CyApp } from '../../AppModel/CyApp'
import { ServiceApp } from '../../AppModel/ServiceApp'
import { ServiceAppTask } from '../../AppModel/ServiceAppTask'
import { ServiceStatus } from '../../AppModel/ServiceStatus'
import {
  add,
  addService,
  AppState,
  clearCurrentTask,
  removeService,
  restore,
  setCurrentTask,
  setStatus,
  updateInputColumn,
  updateServiceParameter,
} from './appStoreImpl'

const createDefaultState = (): AppState => {
  return {
    apps: {},
    serviceApps: {},
    currentTask: undefined,
  }
}

const createTestApp = (id: string): CyApp => {
  return {
    id,
    name: `App ${id}`,
    status: AppStatus.Inactive,
  } as CyApp
}

const createTestServiceApp = (url: string): ServiceApp => {
  return {
    url,
    name: `Service ${url}`,
    parameters: [],
    description: '',
    version: '',
    cyWebAction: [],
    cyWebMenuItem: {} as any,
    author: '',
    citation: '',
  } as ServiceApp
}

describe('AppStoreImpl', () => {
  describe('restore', () => {
    it('should restore apps from database', () => {
      const state = createDefaultState()
      const app1 = createTestApp('app-1')
      const app2 = createTestApp('app-2')
      const apps = [
        { id: 'app-1', cached: app1 },
        { id: 'app-2', cached: app2 },
      ]
      const serviceApps: ServiceApp[] = []

      const result = restore(state, apps, serviceApps)

      expect(result.apps['app-1']).toEqual(app1)
      expect(result.apps['app-2']).toEqual(app2)
      expect(result).not.toBe(state) // Immutability check
    })

    it('should restore service apps', () => {
      const state = createDefaultState()
      const serviceApp = createTestServiceApp('https://example.com/service')

      const result = restore(state, [], [serviceApp])

      expect(result.serviceApps['https://example.com/service']).toEqual(
        serviceApp,
      )
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('add', () => {
    it('should add an app', () => {
      const state = createDefaultState()
      const app = createTestApp('app-1')

      const result = add(state, app, undefined)

      expect(result.apps['app-1']).toBeDefined()
      expect(result.apps['app-1'].status).toBe(AppStatus.Inactive)
      expect(result).not.toBe(state) // Immutability check
    })

    it('should use cached app if available', () => {
      const state = createDefaultState()
      const app = createTestApp('app-1')
      const cachedApp = createTestApp('app-1')
      cachedApp.status = AppStatus.Active

      const result = add(state, app, cachedApp)

      expect(result.apps['app-1']).toEqual(cachedApp)
      expect(result.apps['app-1'].status).toBe(AppStatus.Active)
    })

    it('should not add duplicate app', () => {
      const state = createDefaultState()
      const app = createTestApp('app-1')

      let result = add(state, app, undefined)
      result = add(result, app, undefined)

      expect(Object.keys(result.apps)).toHaveLength(1)
    })
  })

  describe('addService', () => {
    it('should add a service app', () => {
      const state = createDefaultState()
      const serviceApp = createTestServiceApp('https://example.com/service')

      const result = addService(state, serviceApp)

      expect(result.serviceApps['https://example.com/service']).toEqual(
        serviceApp,
      )
      expect(result).not.toBe(state) // Immutability check
    })

    it('should not add duplicate service app', () => {
      const state = createDefaultState()
      const serviceApp = createTestServiceApp('https://example.com/service')

      let result = addService(state, serviceApp)
      result = addService(result, serviceApp)

      expect(Object.keys(result.serviceApps)).toHaveLength(1)
    })
  })

  describe('removeService', () => {
    it('should remove a service app', () => {
      const state = createDefaultState()
      const serviceApp = createTestServiceApp('https://example.com/service')

      let result = addService(state, serviceApp)
      result = removeService(result, 'https://example.com/service')

      expect(result.serviceApps['https://example.com/service']).toBeUndefined()
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('setStatus', () => {
    it('should set app status', () => {
      const state = createDefaultState()
      const app = createTestApp('app-1')

      let result = add(state, app, undefined)
      result = setStatus(result, 'app-1', AppStatus.Active)

      expect(result.apps['app-1'].status).toBe(AppStatus.Active)
      expect(result).not.toBe(state) // Immutability check
    })

    it('should handle non-existent app gracefully', () => {
      const state = createDefaultState()

      const result = setStatus(state, 'non-existent', AppStatus.Active)

      expect(result).toBe(state) // Should return unchanged
    })
  })

  describe('setCurrentTask', () => {
    it('should set current task', () => {
      const state = createDefaultState()
      const task: ServiceAppTask = {
        id: 'task-1',
        status: ServiceStatus.Processing,
        message: '',
        progress: 0,
      }

      const result = setCurrentTask(state, task)

      expect(result.currentTask).toEqual(task)
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('clearCurrentTask', () => {
    it('should clear current task', () => {
      const state = createDefaultState()
      const task: ServiceAppTask = {
        id: 'task-1',
        status: ServiceStatus.Processing,
        message: '',
        progress: 0,
      }

      let result = setCurrentTask(state, task)
      result = clearCurrentTask(result)

      expect(result.currentTask).toBeUndefined()
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('updateServiceParameter', () => {
    it('should update service parameter', () => {
      const state = createDefaultState()
      const url = 'https://example.com/service'
      const serviceApp: ServiceApp = {
        ...createTestServiceApp(url),
        parameters: [
          {
            displayName: 'param1',
            value: 'old-value',
          } as any,
        ],
      }

      let result = addService(state, serviceApp)
      result = updateServiceParameter(result, url, 'param1', 'new-value')

      const updatedServiceApp = result.serviceApps[url]
      const param = updatedServiceApp?.parameters.find(
        (p: any) => p.displayName === 'param1',
      )
      expect(param?.value).toBe('new-value')
      expect(result).not.toBe(state) // Immutability check
    })

    it('should handle non-existent service gracefully', () => {
      const state = createDefaultState()

      const result = updateServiceParameter(
        state,
        'non-existent',
        'param1',
        'value',
      )

      expect(result).toBe(state) // Should return unchanged
    })

    it('should handle non-existent parameter gracefully', () => {
      const state = createDefaultState()
      const serviceApp = createTestServiceApp('https://example.com/service')

      let result = addService(state, serviceApp)
      result = updateServiceParameter(
        result,
        'https://example.com/service',
        'non-existent',
        'value',
      )

      expect(result).toBe(result) // Should return unchanged
    })
  })

  describe('updateInputColumn', () => {
    it('should update input column', () => {
      const state = createDefaultState()
      const url = 'https://example.com/service'
      const serviceApp: ServiceApp = {
        ...createTestServiceApp(url),
        serviceInputDefinition: {
          inputColumns: [
            {
              name: 'col1',
              columnName: 'old-column',
              defaultColumnName: 'old-column',
              dataType: 'string' as any,
              allowMultipleSelection: false,
            },
          ],
          type: 'node' as any,
          scope: 'selected' as any,
          inputNetwork: {
            model: 'network' as any,
            format: 'cx2' as any,
          },
        },
      }

      let result = addService(state, serviceApp)
      result = updateInputColumn(result, url, 'col1', 'new-column')

      const updatedServiceApp = result.serviceApps[url]
      expect(
        updatedServiceApp?.serviceInputDefinition?.inputColumns[0].columnName,
      ).toBe('new-column')
      expect(result).not.toBe(state) // Immutability check
    })

    it('should handle non-existent service gracefully', () => {
      const state = createDefaultState()

      const result = updateInputColumn(
        state,
        'non-existent',
        'col1',
        'new-column',
      )

      expect(result).toBe(state) // Should return unchanged
    })

    it('should handle non-existent input column gracefully', () => {
      const state = createDefaultState()
      const serviceApp = createTestServiceApp('https://example.com/service')

      let result = addService(state, serviceApp)
      result = updateInputColumn(
        result,
        'https://example.com/service',
        'non-existent',
        'new-column',
      )

      expect(result).toBe(result) // Should return unchanged
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalApps = original.apps
      const originalServiceApps = original.serviceApps

      let state = add(original, createTestApp('app-1'), undefined)
      state = addService(state, createTestServiceApp('https://example.com/service'))
      state = setStatus(state, 'app-1', AppStatus.Active)
      state = setCurrentTask(state, {
        id: 'task-1',
        status: ServiceStatus.Processing,
        message: '',
        progress: 0,
      })
      state = clearCurrentTask(state)
      state = removeService(state, 'https://example.com/service')

      // Verify original is unchanged
      expect(original.apps).toBe(originalApps)
      expect(original.serviceApps).toBe(originalServiceApps)
      expect(original.apps).toEqual({})
      expect(original.serviceApps).toEqual({})
      expect(original.currentTask).toBeUndefined()
    })
  })
})

