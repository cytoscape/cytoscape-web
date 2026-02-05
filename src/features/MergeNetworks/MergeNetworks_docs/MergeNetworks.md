# MergeNetworks Feature

## Overview

The MergeNetworks feature provides advanced network merging capabilities, allowing users to combine multiple networks using different merge operations (Union, Intersection, Difference). It supports sophisticated attribute mapping, column matching, and duplicate handling. The feature is particularly useful for integrating data from multiple sources or creating composite networks.

## Architecture

The MergeNetworks feature consists of:
- **Merge Dialog**: Main UI for configuring and executing merges
- **Matching Tables**: Define how attributes are merged across networks
- **Merge Algorithms**: Implement different merge operations
- **Stores**: Manage merge state and matching configurations

## Component Structure

### Main Component
- **MergeDialog.tsx**: Comprehensive dialog for network merging
  - Network selection (available vs. to merge)
  - Merge operation type selection (Union, Intersection, Difference)
  - Advanced options (matching columns, attribute mapping)
  - Merge execution and result handling

### Supporting Components
- **MatchingColumnTable.tsx**: Table for configuring matching columns
- **MatchingTableComp.tsx**: Component for defining attribute mappings
- **Icon.tsx**: Icons for merge operation types

### Merge Algorithms
- **UnionMerge.ts**: Combines all nodes and edges from all networks
- **IntersectionMerge.ts**: Keeps only nodes/edges present in all networks
- **DifferenceMerge.ts**: Removes elements from first network that exist in others
- **CreateMergedNetworkWithView.ts**: Orchestrates merge process

### Stores
- **matchingColumnStore**: Manages column matching configurations
- **nodeMatchingTableStore**: Node attribute mapping tables
- **edgeMatchingTableStore**: Edge attribute mapping tables
- **netMatchingTableStore**: Network attribute mapping tables
- **nodesDuplicationStore**: Tracks duplicate nodes across networks
- **mergeToolTipStore**: Manages merge validation tooltips

## Behavior

### Merge Operations

#### Union
- Combines all nodes and edges from all networks
- Merges nodes/edges with same identifiers
- Adds new nodes/edges that don't exist
- Supports merging within same network (duplicate handling)

#### Intersection
- Keeps only nodes/edges present in ALL networks
- Requires strict matching across networks
- Option to merge only nodes (ignore edges)
- Useful for finding common elements

#### Difference
- Removes elements from first network that exist in others
- Supports strict vs. lenient removal modes
- Limited to two networks
- Useful for filtering networks

### Matching Columns
- Defines which columns are used to match nodes across networks
- Default is "name" column if available
- Can be configured per network
- Affects how duplicates are identified

### Attribute Mapping
- Defines how attributes are merged when nodes/edges match
- Three table views: Node, Edge, Network
- Supports different merge strategies per attribute
- Handles type conflicts and missing values

### Duplicate Handling
- Tracks duplicate nodes across networks
- Warns about duplicates in matching columns
- Option to merge duplicates within same network
- Affects merge behavior and result quality

### Advanced Options
- **Merge within network**: Handles duplicates within same network
- **Merge only nodes**: For intersection, ignores edges
- **Strict remove mode**: For difference, stricter removal rules
- **Matching column configuration**: Per-network column selection
- **Attribute mapping tables**: Detailed attribute merge rules

## Integration Points

- **NetworkStore**: Accesses source networks for merging
- **TableStore**: Accesses node/edge tables for attribute data
- **NetworkSummaryStore**: Accesses network metadata
- **ViewModelStore**: May use selection for filtering
- **WorkspaceStore**: Adds merged network to workspace
- **VisualStyleStore**: Creates visual style for merged network
- **LayoutStore**: Applies layout to merged network

## Design Decisions

### Three Merge Types
- Union, Intersection, and Difference cover most use cases
- Each type has specific UI and validation
- Difference limited to two networks for clarity

### Matching Column System
- Flexible column selection per network
- Defaults to "name" for convenience
- Validates column existence and type

### Attribute Mapping Tables
- Separate tables for nodes, edges, and network attributes
- Allows fine-grained control over attribute merging
- Supports different strategies per attribute

### Duplicate Detection
- Proactive duplicate detection and warnings
- Visual indicators for problematic duplicates
- Options to handle duplicates appropriately

### Full-Screen Dialog
- Complex merge configuration requires space
- Full-screen mode improves usability
- Toggle for user preference

## Future Improvements

- Support for more than two networks in Difference
- Automatic matching column detection
- Merge preview before execution
- Merge templates/presets
- Batch merge operations
- Merge conflict resolution UI
- Performance optimization for large networks

