import { IdType } from '../../../models'
import { applyCpLayout } from '../utils/hierarchy-util'

// Set up the worker context
self.onmessage = (event) => {
  const { cpViewModel, subsystemNodeId, networkId, nodeTable, nodeViews } =
    event.data

  try {
    // Execute the heavy layoput calculation
    const positions: Map<IdType, [number, number]> = applyCpLayout(
      cpViewModel,
      subsystemNodeId,
      networkId,
      nodeTable,
      nodeViews,
    )

    // Send back the result
    self.postMessage({
      success: true,
      positions: Array.from(positions.entries()),
    })
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
    })
  }
}
