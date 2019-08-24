module.exports = {
    GET_ALL_BACKENDS_PIPELINE: [
        { $match: { path: { $in: ['/', '/collections', '/processes', '/service_types', '/output_formats'] } } },
        // This would be more dynamic and is effectively the same: { $match: { path: { $regex: "^\/[a-z_]*$" } } }
        // But since the endpoints are hardcoded anyway there's no benefit, especially not when considering regex slowness.
        { $sort: { backend: 1, path: 1 } },
        { $group: {
            _id: '$backend',
            backend: { $first: '$backend' },
            backendTitle: { $first: '$backendTitle' },
            group: { $first: '$group' },
            retrieved: { $max: '$retrieved' },
            unsuccessfulCrawls: { $first: '$unsuccessfulCrawls' },
            contents: { $push: '$content' },
            paths: {$push: '$path'}
        } },
        { $addFields: {
            root: { $arrayElemAt: [ '$contents', { $indexOfArray: ['$paths', '/'] } ] },
            collections: { $let: {
                vars: { index: {$indexOfArray: ['$paths', '/collections']}},
                in: { $cond: { if: { $eq: ['$$index', -1] }, then: null, else: { $arrayElemAt: [ '$contents', '$$index' ] } } }
            } },
            processes: { $let: {
                vars: { index: {$indexOfArray: ['$paths', '/processes']}},
                in: { $cond: { if: { $eq: ['$$index', -1] }, then: null, else: { $arrayElemAt: [ '$contents', '$$index' ] } } }
            } },
            outputFormats: { $let: {
                vars: { index: {$indexOfArray: ['$paths', '/output_formats']}},
                in: { $cond: { if: { $eq: ['$$index', -1] }, then: null, else: { $arrayElemAt: [ '$contents', '$$index' ] } } }
            } },
            serviceTypes: { $let: {
                vars: { index: {$indexOfArray: ['$paths', '/service_types']}},
                in: { $cond: { if: { $eq: ['$$index', -1] }, then: null, else: { $arrayElemAt: [ '$contents', '$$index' ] } } }
            } }
        } },
        { $project: {
            backend: 1,
            backendTitle: 1,
            group: 1,
            retrieved: 1,
            unsuccessfulCrawls: 1,
            version: '$root.version',
            api_version: '$root.api_version',
            description: '$root.description',
            endpoints: {
                $reduce: {
                    input: {
                        $map: { input: '$root.endpoints', as: 'endpoint', in: { 
                            $map: { input: '$$endpoint.methods', as: 'method', in:{
                                $concat: ['$$method',' ','$$endpoint.path']
                            }}
                        }}
                    },
                    initialValue: [],
                    in: {
                        $concatArrays: ['$$value', '$$this']
                    }
                }
            },
            collections: '$collections.collections',
            processes: '$processes.processes',
            outputFormats: 1,
            serviceTypes: 1,
            billing: '$root.billing'
        } }
    ],
    GET_ALL_COLLECTIONS_PIPELINE: [
        { $match: { path: '/collections' } },
        { $addFields: { 'content.collections.backend': '$backend', 'content.collections.backendTitle': '$backendTitle', 'content.collections.retrieved': '$retrieved', 'content.collections.unsuccessfulCrawls': '$unsuccessfulCrawls' } },
        { $project: { 'collection': '$content.collections' } },
        { $unwind: '$collection' },
        { $replaceRoot: { newRoot: '$collection' } }
    ],
    GET_ALL_PROCESSES_PIPELINE: [
        // basically like for collections
        { $match: { path: '/processes' } },
        { $addFields: { 'content.processes.backend': '$backend', 'content.processes.backendTitle': '$backendTitle', 'content.processes.retrieved': '$retrieved', 'content.processes.unsuccessfulCrawls': '$unsuccessfulCrawls' } },
        { $project: { 'process': '$content.processes' } },
        { $unwind: '$process' },
        { $replaceRoot: {newRoot: '$process'} },
        // convert `parameters` object to array because otherwise we can't search for parameter descriptions (MongoDB doesn't support wildcards for object keys)
        { $addFields: { 'parametersAsArray' : { $objectToArray: '$parameters' } } }
    ],
    GET_ALL_OUTPUT_FORMATS_WITH_COUNT_PIPELINE: [
        { $match: { outputFormats: {$exists: true} } },  // only consider backends that have output formats
        { $addFields: { 'outputFormatsAsArray' : {$objectToArray: {$ifNull: ['$outputFormats.formats', '$outputFormats']} } } },  // output formats are saved as object keys -> convert to array
        { $project: {outputFormats: { $map: {input: '$outputFormatsAsArray', as: 'of', in: "$$of.k"} } } },  // map values into top level of object (didn't work without this for some reason)
        { $unwind: "$outputFormats" },  // get one entry for each output format
        { $group: { _id: "$outputFormats", format: {$first: "$outputFormats"}, count: {$sum: 1} } },  // group by format name, at the same time calculate the sum
        { $sort: {count: -1, format: 1} }  // sort by count DESC, format name ASC
    ],
    GET_ALL_SERVICE_TYPES_WITH_COUNT_PIPELINE: [
        { $match: { serviceTypes: {$exists: true} } },  // only consider backends that have service types
        { $addFields: { 'serviceTypesAsArray' : {$objectToArray: '$serviceTypes' } } },  // service types are saved as object keys -> convert to array
        { $project: {serviceTypes: { $map: {input: '$serviceTypesAsArray', as: 'st', in: "$$st.k"} } } },  // map values into top level of object (didn't work without this for some reason)
        { $unwind: "$serviceTypes" },  // get one entry for each service type
        { $group: { _id: "$serviceTypes", service: {$first: "$serviceTypes"}, count: {$sum: 1} } },  // group by service type name, at the same time calculate the sum
        { $sort: {count: -1, service: 1} }  // sort by count DESC, service name ASC
    ]
};
