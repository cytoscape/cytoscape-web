import { Paper, Center, Title, Container, Space } from '@mantine/core';

import { TableUpload } from './TableUpload';
import { useTableDataLoaderStore } from '../store';

import { TableDataLoaderStep } from '../models/TableDataLoaderModels';
import { TableColumnAssignmentForm } from './TableColumnAssignmentForm';
import { TableViewer } from './TableViewer';
import { PrimeReactProvider } from 'primereact/api';

export function TableDataLoader() {
  const step = useTableDataLoaderStore((state) => state.step);

  const stepContentMap = {
    [TableDataLoaderStep.FileUpload]: <TableUpload></TableUpload>,
    [TableDataLoaderStep.ColumnAssignmentForm]: <TableColumnAssignmentForm />,
    [TableDataLoaderStep.TableViewer]: <TableViewer></TableViewer>,
  };

  const content = stepContentMap[step];

  return (
    <PrimeReactProvider>
      <Container p="md" bg="#D6D6D6">
        <Paper p="md" shadow="md">
          {content}
        </Paper>
      </Container>
    </PrimeReactProvider>
  );
}
