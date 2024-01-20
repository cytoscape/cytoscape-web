
/**
 * Service information
 * The value returned from the top-level service endpoint
 * e.g. http://cd.ndexbio.org/cd/communitydetection/v1
 * 
 * This entry will be used to create the root menu items for the service apps
 * 
 */
export interface Services {
  /**
   * List of available algorithms to be applied to a network / nodes / edges
   */
  algorithms: Algorithm[] 

  name?: string
  description?: string
  inputDataFormat?: string
  outputDataFormat?: string
}


/** 
 * Service information with status (active / error)
 * 
 * This entry will be used to create the root menu items for the service apps
 * 
 */
export interface ServiceStatus {
  url: string // Unique identifier of the service
  services?: Services
  error?: string
}

export interface Algorithm {
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
