export interface Services {
  algorithms: {
    [key: string]: Service
  }
}

export interface Service {
  // Name of algorithm
  name: string;
  
  // Display name of algorithm
  displayName: string;
  
  // Description of algorithm
  description: string;
  
  // Version of algorithm
  version: string;
  
  // Docker image
  dockerImage: string;
  
  // Expected format of input data. For supported formats see:  https://github.com/cytoscape/communitydetection-rest-server/wiki/Data-formats
  inputDataFormat: string;
  
  // Format of output data. For supported formats see:  https://github.com/cytoscape/communitydetection-rest-server/wiki/Data-formats
  outputDataFormat: string;
  
  rawResultContentType: string;
  
  binaryResult: boolean;
}
