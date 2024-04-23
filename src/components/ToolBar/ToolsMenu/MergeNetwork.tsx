import React, { useState, ReactElement } from 'react';
import { BaseMenuProps } from '../BaseMenuProps';
import MenuItem from '@mui/material/MenuItem';
import MergeDialog from '../../../features/MergeNetworks/components/MergeDialog';
import { IdType } from '../../../models/IdType';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore';
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel';
import { Pair } from '../../../models/MergeModel/utils/Pair';

export const MergeNetwork = ({ handleClose }: BaseMenuProps): ReactElement => {
    const [openDialog, setOpenDialog] = useState<boolean>(false);

    const networkIds: IdType[] = useWorkspaceStore(
        (state) => state.workspace.networkIds,
    )
    const networkSummaries: Record<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
        (state) => state.summaries,
    )

    const workSpaceNetworks: Pair<string, string>[] = networkIds.map((networkId) => {
        const networkName = networkSummaries[networkId]?.name
        return [networkName, networkId]
    })
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
                workSpaceNetworks={workSpaceNetworks}
            />
        </>
    );
};