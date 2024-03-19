import React, { useState, ReactElement } from 'react';
import { BaseMenuProps } from '../BaseMenuProps';
import MenuItem from '@mui/material/MenuItem';
import MergeDialog, { NetworkToMerge } from './MergeDialog';
import { IdType } from '../../../models/IdType';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore';
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel';
import { useTableStore } from '../../../store/TableStore';
import { TableRecord } from '../../../store/TableStore'
import { Column } from '../../../models/TableModel';

export const MergeNetwork = ({ handleClose }: BaseMenuProps): ReactElement => {
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const currentNetworkId: IdType = useWorkspaceStore(
        (state) => state.workspace.currentNetworkId,
    )
    const networkIds: IdType[] = useWorkspaceStore(
        (state) => state.workspace.networkIds,
    )
    const networkSummaries: Record<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
        (state) => state.summaries,
    )
    const networkTables: Record<IdType, TableRecord> = useTableStore((state) => state.tables);
    console.log(networkTables)
    // Information about the current network
    const currentNetwork: { ownerUUID: IdType; name: string, nodeColumns: Column[], edgeColumns: Column[] } = {
        ownerUUID: currentNetworkId as IdType,
        name: networkSummaries[currentNetworkId]?.name ?? '',
        nodeColumns: networkTables[currentNetworkId]?.nodeTable?.columns ?? [],
        edgeColumns: networkTables[currentNetworkId]?.edgeTable?.columns ?? []
    };

    // Information about other available networks in workspace
    const availableNetworks: Record<IdType, NetworkToMerge> = networkIds.reduce((acc, networkId) => ({
        ...acc,
        ...(networkId !== currentNetworkId ? {
            [networkId]: {
                name: networkSummaries[networkId]?.name ?? '',
                nodeColumns: networkTables[networkId]?.nodeTable?.columns ?? [],
                edgeColumns: networkTables[networkId]?.edgeTable?.columns ?? []
            }
        } : {})
    }), {});


    const handleOpenDialog = (): void => {
        setOpenDialog(true);
    };

    const handleCloseDialog = (): void => {
        setOpenDialog(false);
        handleClose(); // Call handleClose from props if needed
    };

    return (
        <>
            <MenuItem onClick={handleOpenDialog}>
                Merge Networks
            </MenuItem>
            <MergeDialog
                open={openDialog}
                handleClose={handleCloseDialog}
                currentNetwork={currentNetwork}
                availableNetworks={availableNetworks}
            />
        </>
    );
};