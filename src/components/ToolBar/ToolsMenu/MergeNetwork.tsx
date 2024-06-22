import React, { useState, ReactElement } from 'react';
import { BaseMenuProps } from '../BaseMenuProps';
import MenuItem from '@mui/material/MenuItem';
import MergeDialog from '../../../features/MergeNetworks/components/MergeDialog';
import { IdType } from '../../../models/IdType';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore';
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel';
import { NetworkRecord, Pair } from '../../../features/MergeNetworks/models/DataInterfaceForMerge';
import { generateUniqueName } from '../../../utils/network-utils';
import { useTableStore } from '../../../store/TableStore';
import { useNetworkStore } from '../../../store/NetworkStore';
import { getNetTableFromSummary } from '../../../features/MergeNetworks/utils/helper-functions';
import { Network } from '../../../models/NetworkModel';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { VisualStyle } from '../../../models/VisualStyleModel';

export const MergeNetwork = ({ handleClose }: BaseMenuProps): ReactElement => {
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const networkIds: IdType[] = useWorkspaceStore(
        (state) => state.workspace.networkIds,
    )
    const networkSummaries: Record<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
        (state) => state.summaries,
    )
    const networkVisualStyles: Record<string, VisualStyle> = useVisualStyleStore(state => state.visualStyles)
    const networkTables = useTableStore(state => state.tables);
    const networkStore = useNetworkStore(state => state.networks)
    const workSpaceNetworks: Pair<string, string>[] = networkIds.map((networkId) => {
        const networkName = networkSummaries[networkId]?.name
        return [networkName, networkId]
    })
    const uniqueName = generateUniqueName(workSpaceNetworks.map(net => net[0]), 'Merged Network');

    const handleOpenDialog = (): void => {
        setOpenDialog(true);
    };

    const handleCloseDialog = (): void => {
        setOpenDialog(false);
        handleClose(); // Call handleClose from props if needed
    };

    // check whether there are networks that are already loaded
    const networksLoaded: Record<IdType, NetworkRecord> = {};
    networkIds.forEach((networkId) => {
        if (networkTables.hasOwnProperty(networkId) && networkSummaries.hasOwnProperty(networkId)
            && networkStore.has(networkId)) {
            networksLoaded[networkId] = {
                network: networkStore.get(networkId) ?? ({} as Network),
                nodeTable: networkTables[networkId].nodeTable,
                edgeTable: networkTables[networkId].edgeTable,
                netTable: getNetTableFromSummary(networkSummaries[networkId]),
                visualStyle: networkVisualStyles[networkId]
            }
        }
    })

    return (
        <>
            <MenuItem onClick={handleOpenDialog}>
                Merge Networks
            </MenuItem>
            <MergeDialog
                open={openDialog}
                handleClose={handleCloseDialog}
                uniqueName={uniqueName}
                workSpaceNetworks={workSpaceNetworks}
                networksLoaded={networksLoaded}
            />
        </>
    );
};