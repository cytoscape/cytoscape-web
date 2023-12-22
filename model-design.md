# Cytoscape Web Data Model Design

(TBD)

## The hierarchy of data

- Workspace
  - List of Networks
    - Network Model
      - List of View Models
      - A Visual Style

## Networks

- Network ID iwll be used as the key of all models

### View Model

- By default, the first element in the network view list will be used. Use _*getNetworkView(NETWORK_ID)*_ method to get it. All apply methods will apply to the first view model.
