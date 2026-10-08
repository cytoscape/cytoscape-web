import React from 'react'
import { DataEditorRef } from '@glideapps/glide-data-grid'

export const useTableScrollToTop = (
  nodeDataEditorRef: React.RefObject<DataEditorRef>,
  edgeDataEditorRef: React.RefObject<DataEditorRef>,
  selectedElements: string[],
) => {
  React.useEffect(() => {
    // scroll to the first result anytime someone changes the filtered rows
    // e.g. when the user selects nodes in the network view, scroll to the top of the list in the table
    nodeDataEditorRef.current?.scrollTo(0, 0, 'both', 0, 0, {
      vAlign: 'start',
      hAlign: 'start',
    })
    edgeDataEditorRef.current?.scrollTo(0, 0, 'both', 0, 0, {
      vAlign: 'start',
      hAlign: 'start',
    })
  }, [selectedElements, nodeDataEditorRef, edgeDataEditorRef])
}
