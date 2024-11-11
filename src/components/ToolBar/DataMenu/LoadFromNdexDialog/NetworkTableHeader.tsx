import { TableCell, TableHead, TableRow } from "@mui/material";
import { ReactElement } from "react";

const NetworkTableHeader = (): ReactElement => (
  <TableHead>
    <TableRow>
      <TableCell padding="checkbox"></TableCell>
      <TableCell>Network</TableCell>
      <TableCell>Owner</TableCell>
      <TableCell>Nodes</TableCell>
      <TableCell>Edges</TableCell>
      <TableCell>Last modified</TableCell>
    </TableRow>
  </TableHead>
);

export default NetworkTableHeader;