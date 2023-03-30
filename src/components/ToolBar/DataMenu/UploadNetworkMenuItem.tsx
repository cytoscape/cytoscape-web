import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { Cx2 } from '../../../utils/cx/Cx2'
import NetworkFn, { Network } from '../../../models/NetworkModel'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import ViewModelFn, { NetworkView } from '../../../models/ViewModel'
import { v4 as uuidv4 } from 'uuid';
import TableFn, { Table } from '../../../models/TableModel'
import { useTableStore } from '../../../store/TableStore'

import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import {
  putNetworkToDb,
  putTablesToDb,
  putVisualStyleToDb,
  putNetworkViewToDb,
} from '../../../store/persist/db'


export const UploadNetworkMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  interface JsonContent {
    [key: string]: any;
  }

  interface FullNetworkData {
    network: Network
    nodeTable: Table
    edgeTable: Table
    visualStyle: VisualStyle
    networkView: NetworkView
  }


  const addNewNetwork = useNetworkStore((state) => state.add)

  const setVisualStyle = useVisualStyleStore((state) => state.set)

  const setViewModel = useViewModelStore((state) => state.setViewModel)

  const setTables = useTableStore((state) => state.setTables)

  const createDataFromLocalCx2 = async (
    LocalNetworkId: string,
    cxData: Cx2,
  ): Promise<FullNetworkData> => {
    const network: Network = NetworkFn.createNetworkFromCx(LocalNetworkId, cxData)
    await putNetworkToDb(network)

    const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
      LocalNetworkId,
      cxData,
    )
    await putTablesToDb(LocalNetworkId, nodeTable, edgeTable)

    const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cxData)
    await putVisualStyleToDb(LocalNetworkId, visualStyle)
  
    const networkView: NetworkView = ViewModelFn.createViewModelFromCX(
      LocalNetworkId,
      cxData,
    )
    await putNetworkViewToDb(LocalNetworkId, networkView)
  
    return { network, nodeTable, edgeTable, visualStyle, networkView }
  }
  
    const [jsonContent, setJsonContent] = useState<JsonContent | null>(null);
  
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];
      if (file == null) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setJsonContent(json);
          console.log(json);
          const localUuid = uuidv4();
          const res = await createDataFromLocalCx2(localUuid, json)
          console.log(res)
          const { network, nodeTable, edgeTable, visualStyle, networkView } = res

          addNewNetwork(network)
          setVisualStyle(localUuid, visualStyle)
          setTables(localUuid, nodeTable, edgeTable)
          setViewModel(localUuid, networkView)
        } catch (error) {
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
  

  const menuItem = (
    <MenuItem component="label">
    Upload network from file
    <input
      type="file"
      accept=".cx2"
      style={{ display: "none" }}
      onChange={handleFileChange}
    />
  </MenuItem>
  )
    return <>{menuItem}{(jsonContent != null) && <pre>{JSON.stringify(jsonContent, null, 2)}</pre>}</>

}