# External API

## Overview

The `external-api` directory contains client integrations for external services used by Cytoscape Web. Currently, this includes NDEx (Network Data Exchange) and Cytoscape Desktop integrations.

## Architecture

### NDEx Integration (`ndex/`)

The NDEx module provides a complete client for interacting with the NDEx API, including network fetching, updating, querying, and workspace management.

### Cytoscape Desktop Integration (`cytoscape/`)

Integration with Cytoscape Desktop for opening networks in the desktop application.

## NDEx API

### Client Configuration

The NDEx client is configured via `config.ts`:
- Base URL is loaded from `config.json` at module initialization
- Can be overridden at runtime for testing or custom deployments
- Authentication tokens are passed per-request

### Main Exports

From `ndex/index.ts`:

**Client:**
- `getNdexClient(accessToken?, url?)`: Creates a configured NDEx client instance

**Network Operations:**
- `fetchNdexNetwork(ndexUuid, accessToken?, ndexUrl?)`: Fetches a network from NDEx as CX2
- `updateNdexNetwork(networkId, cx, accessToken?, ndexUrl?)`: Updates a network in NDEx

**Network Summary Operations:**
- `fetchNdexSummaries(accessToken?, ndexUrl?)`: Fetches network summaries from NDEx
- `getNetworkValidationStatus(networkId, accessToken?, ndexUrl?)`: Gets validation status

**Query Operations:**
- `fetchGeneNamesFromIds(geneIds, accessToken?, ndexUrl?)`: Converts gene IDs to names
- `fetchNdexInterconnectQuery(query, accessToken?, ndexUrl?)`: Performs interconnect queries

**Workspace Operations:**
- `fetchNdexWorkspaces(accessToken?, ndexUrl?)`: Fetches user's NDEx workspaces
- `createNdexWorkspace(workspace, accessToken?, ndexUrl?)`: Creates a new workspace
- `updateNdexWorkspace(workspaceId, workspace, accessToken?, ndexUrl?)`: Updates workspace
- `deleteNdexWorkspace(workspaceId, accessToken?, ndexUrl?)`: Deletes workspace

**Permissions Operations:**
- `getNdexNetworkPermission(networkId, accessToken?, ndexUrl?)`: Gets network permissions
- `hasNdexEditPermission(networkId, accessToken?, ndexUrl?)`: Checks if the user has edit permission

### Usage Examples

#### Fetching a Network

```typescript
import { fetchNdexNetwork } from '../data/external-api/ndex'

const cxData = await fetchNdexNetwork(networkUuid, accessToken)
```

#### Fetching Network Summaries

```typescript
import { fetchNdexSummaries } from '../data/external-api/ndex'

const summaries = await fetchNdexSummaries(accessToken)
```

#### Updating a Network

```typescript
import { updateNdexNetwork } from '../data/external-api/ndex'

await updateNdexNetwork(networkUuid, cx2Data, accessToken)
```

#### Querying Networks

```typescript
import { fetchNdexInterconnectQuery } from '../data/external-api/ndex'

const results = await fetchNdexInterconnectQuery({
  sourceIds: ['gene1', 'gene2'],
  targetIds: ['gene3', 'gene4'],
}, accessToken)
```

### Error Handling

The NDEx client includes comprehensive error handling:
- Network errors are caught and wrapped in `NdexError`
- Authentication errors are handled separately
- Rate limiting and retry logic can be added

See `errors.ts` for error type definitions.

### Type Definitions

- `NdexNetworkSummary`: Network summary metadata from NDEx
- `NdexNetworkProperty`: Network property definitions

## Cytoscape Desktop Integration

The Cytoscape Desktop integration allows opening networks in the desktop application. See `cytoscape/cytoscape-api.md` for details.

## Authentication

Authentication is handled via access tokens:
- Tokens are obtained from the `CredentialStore`
- Tokens are passed to API functions as optional parameters
- Token expiration is handled by the credential store

## Configuration

NDEx base URL is configured in `assets/config.json`:
```json
{
  "ndexBaseUrl": "https://www.ndexbio.org/v2"
}
```

The URL can be overridden at runtime for testing or custom deployments.

## Testing

Each module includes comprehensive test coverage:
- `client.test.ts`: Client configuration and initialization
- `network.test.ts`: Network fetch and update operations
- `networkSummary.test.ts`: Summary fetching
- `query.test.ts`: Query operations
- `workspace.test.ts`: Workspace operations
- `permissions.test.ts`: Permission management

## Integration with Application

The NDEx API is primarily used by:
- `hooks/useLoadCyNetwork.ts`: Fetches networks when not in local cache
- `hooks/useSaveCyNetworkToNDEx.ts`: Saves networks to NDEx
- `hooks/useSaveWorkspaceToNDEx.ts`: Saves workspaces to NDEx
- `hooks/useLoadNetworkSummaries.ts`: Loads network summaries

## Future Improvements

- Add retry logic for failed requests
- Implement request caching
- Add rate limiting support
- Expand Cytoscape Desktop integration
- Add support for additional external APIs

