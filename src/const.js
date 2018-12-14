// To construct this constant, load the openEO API spec's `openapi.json` doc as `api` in a JS environment and run the following code:
// '[\n' + Object.keys(api.paths).map(p => Object.keys(api.paths[p]).filter(m => m != 'parameters').map(m => "    '" + m.toUpperCase() + ' ' + p + "'").join(",\n")).join(",\n") + '\n]'
// In the long run, we might publish the API spec to NPM. Then it could be specified as a dependency and so this constant could be derived dynamically.
export const OPENEO_V0_3_1_ENDPOINTS = [
    'GET /',
    'GET /output_formats',
    'GET /collections',
    'GET /collections/{name}',
    'GET /processes',
    'GET /credentials/oidc',
    'GET /credentials/basic',
    'POST /validation',
    'POST /preview',
    'GET /process_graphs',
    'POST /process_graphs',
    'GET /process_graphs/{process_graph_id}',
    'PATCH /process_graphs/{process_graph_id}',
    'DELETE /process_graphs/{process_graph_id}',
    'GET /service_types',
    'GET /services',
    'POST /services',
    'PATCH /services/{service_id}',
    'GET /services/{service_id}',
    'DELETE /services/{service_id}',
    'GET /jobs',
    'POST /jobs',
    'PATCH /jobs/{job_id}',
    'GET /jobs/{job_id}',
    'DELETE /jobs/{job_id}',
    'GET /jobs/{job_id}/estimate',
    'GET /jobs/{job_id}/results',
    'POST /jobs/{job_id}/results',
    'DELETE /jobs/{job_id}/results',
    'GET /files/{user_id}',
    'GET /files/{user_id}/{path}',
    'PUT /files/{user_id}/{path}',
    'DELETE /files/{user_id}/{path}',
    'GET /me',
    'GET /subscription'
];

// Manual assignment of the endpoints above to individual features.
// A functionality is considered supported when ALL of the corresponding endpoints are supported.
export const OPENEO_V0_3_1_FUNCTIONALITIES = {
    'Basic functionality': [
        'GET /',
        'GET /collections',
        'GET /collections/{name}',
        'GET /processes',
        'GET /output_formats'
    ],
    'Authenticate with HTTP Basic': [  // TODO: Remove later because this auth method should not be used
        'GET /credentials/basic',
        //'GET /me'   // not necessarily needed (just outputs metadata)
    ],
    'Authenticate with OpenID Connect': [  // TODO: Remove later because the user doesn't care HOW the auth works
        'GET /credentials/oidc',
        //'GET /me'   // not necessarily needed (just outputs metadata)
    ],
    'Batch processing': [
        'GET /jobs',
        'POST /jobs',
        'GET /jobs/{job_id}',
        //'PATCH /jobs/{job_id}',   // not necessarily needed (can be achieved by deleting and re-creating)
        'DELETE /jobs/{job_id}',
        'GET /jobs/{job_id}/results',
        'POST /jobs/{job_id}/results',
        //'DELETE /jobs/{job_id}/results'   // not necessarily needed (can be deleted by deleting the entire job)
    ],
    'Estimate processing costs': [
        'GET /jobs/{job_id}/estimate'
    ],
    'Preview processing results': [
        'POST /preview'
    ],
    'Secondary web services': [
        'GET /service_types',
        'GET /services',
        'POST /services',
        'GET /services/{service_id}',
        //'PATCH /services/{service_id}',   // not necessarily needed (can be achieved by deleting and re-creating)
        'DELETE /services/{service_id}',
    ],
    'File storage': [
        'GET /files/{user_id}',
        'GET /files/{user_id}/{path}',
        'PUT /files/{user_id}/{path}',
        'DELETE /files/{user_id}/{path}'
    ],
    'Stored process graphs': [
        'GET /process_graphs',
        'POST /process_graphs',
        'GET /process_graphs/{process_graph_id}',
        //'PATCH /process_graphs/{process_graph_id}',   // not necessarily needed (can be achieved by deleting and re-creating)
        'DELETE /process_graphs/{process_graph_id}'
    ],
    'Validate process graphs': [
        'POST /validation',
    ],
    'Notifications and monitoring': [
        'GET /subscription'
    ]
};
