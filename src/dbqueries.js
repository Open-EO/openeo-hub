module.exports = {
    GET_ALL_BACKENDS_PIPELINE: [
        { $match: { path: { $in: ['/', '/collections', '/processes', '/service_types', '/output_formats', '/file_formats', '/udf_runtimes'] } } },
        // This would be more dynamic and is effectively the same: { $match: { path: { $regex: "^\/[a-z_]*$" } } }
        // But since the endpoints are hardcoded anyway there's no benefit, especially not when considering regex slowness.
        { $sort: { backend: 1, path: 1 } },
        { $group: {
            _id: {$concat: ['$service', '@', '$api_version']},
            service: { $first: '$service' },
            api_version: { $first: '$api_version' },
            backend: { $first: '$backend' },
            backendTitle: { $first: '$backendTitle' },
            group: { $first: '$group' },
            retrieved: { $min: '$retrieved' },   // use `min` to get the earliest (-> "worst") of the timestamps
            unsuccessfulCrawls: { $max: '$unsuccessfulCrawls' },   // use `max` to get the largest (-> "worst") number
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
            fileFormats: { $let: {
                vars: {
                    index1: {$indexOfArray: ['$paths', '/output_formats']},
                    index2: {$indexOfArray: ['$paths', '/file_formats']}
                },
                in: { $let: {
                    vars: { index: { $cond: { if: { $eq: ['$$index1', -1] }, then: "$$index2", else: "$$index1" } } },
                    in: { $cond: { if: { $eq: ['$$index', -1] }, then: null, else: { $arrayElemAt: [ '$contents', '$$index' ] } } }
            } } } },
            serviceTypes: { $let: {
                vars: { index: {$indexOfArray: ['$paths', '/service_types']}},
                in: { $cond: { if: { $eq: ['$$index', -1] }, then: null, else: { $arrayElemAt: [ '$contents', '$$index' ] } } }
            } },
            udfRuntimes: { $let: {
                vars: { index: {$indexOfArray: ['$paths', '/udf_runtimes']}},
                in: { $cond: { if: { $eq: ['$$index', -1] }, then: null, else: { $arrayElemAt: [ '$contents', '$$index' ] } } }
            } }
        } },
        { $project: {
            service: 1,
            api_version: 1,
            backend: 1,
            backendTitle: 1,
            group: 1,
            retrieved: 1,
            unsuccessfulCrawls: 1,
            production: { $ifNull: ['$root.production', false] },
            api_version: '$root.api_version',
            description: '$root.description',
            links: { $ifNull: ['$root.links', []] },
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
            fileFormats: {
                input: { $ifNull: ['$fileFormats.input', {}] },   // input formats didn't exist in API v0.4 -> empty object as default
                output: { $ifNull: ['$fileFormats.output', '$fileFormats'] }   // first item: API v1.0, second item: API v0.4
            },
            serviceTypes: 1,
            udfRuntimes: 1,
            billing: '$root.billing'
        } }
    ],
    GET_ALL_COLLECTIONS_PIPELINE: [
        { $match: { path: '/collections', 'content.collections': {$exists: true} } },
        { $addFields: {
            'content.collections.service': '$service',
            'content.collections.api_version': '$api_version',
            'content.collections.backend': '$backend',
            'content.collections.backendTitle': '$backendTitle',
            'content.collections.retrieved': '$retrieved',
            'content.collections.unsuccessfulCrawls': '$unsuccessfulCrawls' } },
        { $project: { 'collection': '$content.collections' } },
        { $unwind: '$collection' },
        { $group: {   // ensure unique IDs, see issue #76
            _id: { id: '$collection.id', service: '$collection.service', api_version: '$collection.api_version' },  // unique key of "collections" collection
            collection: { $first: "$collection" } } },
        { $replaceRoot: { newRoot: '$collection' } }
    ],
    GET_ALL_PROCESSES_PIPELINE: [
        // basically like for collections
        { $match: { path: '/processes', 'content.processes': {$exists: true} } },
        { $addFields: {
            'content.processes.service': '$service',
            'content.processes.api_version': '$api_version',
            'content.processes.backend': '$backend',
            'content.processes.backendTitle': '$backendTitle',
            'content.processes.retrieved': '$retrieved',
            'content.processes.unsuccessfulCrawls': '$unsuccessfulCrawls' } },
        { $project: { 'process': '$content.processes' } },
        { $unwind: '$process' },
        { $group: {   // ensure unique IDs, see issue #76
            _id: { id: '$process.id', service: '$process.service', api_version: '$process.api_version' },  // unique key of "processes" collection
            process: { $first: "$process" } } },
        { $replaceRoot: {newRoot: '$process'} }
    ],
    GET_DISTINCT_COLLECTIONS_PIPELINE: [
        { $project: {id: 1, title: 1} },
        { $group: {     // group by collection id, at the same time calculate the sum, and maintain title
            _id: {$toLower: "$id"},
            id: {$first: "$id"},
            title: {$first: "$title"},  // if a collection *does* appear twice, the title is usually the same, so just using the first occurrence is enough
        } },
        { $sort: {id: 1} }  // sort by id ASC
    ],
    GET_DISTINCT_PROCESSES_WITH_COUNT_PIPELINE: [
        { $project: {id: 1, summary: 1} },
        { $group: {     // group by process id, at the same time calculate the sum, and maintain summary/allSummaries
            _id: {$toLower: "$id"},
            id: {$first: "$id"},
            summary: {$first: "$summary"},   // simply the first occurrence for easy displaying
            allSummaries: {$addToSet: "$summary"},  // processes can appear many times with quite different summaries, so it's better to return them all
            count: {$sum: 1}
        } },
        { $sort: {count: -1, id: 1} }  // sort by count DESC, id ASC
    ],
    GET_ALL_INPUT_FORMATS_WITH_COUNT_PIPELINE: [
        { $match: { fileFormats: {$exists: true} } },  // only consider backends that have file formats
        { $addFields: { 'inputFormatsAsArray' : {$objectToArray: '$fileFormats.input' } } },  // input formats are saved as object keys -> convert to array
        { $project: {inputFormats: { $map: {input: '$inputFormatsAsArray', as: 'if', in: "$$if.k"} } } },  // map values into top level of object (didn't work without this for some reason)
        { $unwind: "$inputFormats" },  // get one entry for each input format
        { $group: { _id: {$toLower: "$inputFormats"}, format: {$first: "$inputFormats"}, count: {$sum: 1} } },  // group by format name, at the same time calculate the sum
        { $sort: {count: -1, format: 1} }  // sort by count DESC, format name ASC
    ],
    GET_ALL_OUTPUT_FORMATS_WITH_COUNT_PIPELINE: [
        { $match: { fileFormats: {$exists: true} } },  // only consider backends that have file formats
        { $addFields: { 'outputFormatsAsArray' : {$objectToArray: '$fileFormats.output' } } },  // output formats are saved as object keys -> convert to array
        { $project: {outputFormats: { $map: {input: '$outputFormatsAsArray', as: 'of', in: "$$of.k"} } } },  // map values into top level of object (didn't work without this for some reason)
        { $unwind: "$outputFormats" },  // get one entry for each output format
        { $group: { _id: {$toLower: "$outputFormats"}, format: {$first: "$outputFormats"}, count: {$sum: 1} } },  // group by format name, at the same time calculate the sum
        { $sort: {count: -1, format: 1} }  // sort by count DESC, format name ASC
    ],
    GET_ALL_SERVICE_TYPES_WITH_COUNT_PIPELINE: [
        { $match: { serviceTypes: {$exists: true} } },  // only consider backends that have service types
        { $addFields: { 'serviceTypesAsArray' : {$objectToArray: '$serviceTypes' } } },  // service types are saved as object keys -> convert to array
        { $project: {serviceTypes: { $map: {input: '$serviceTypesAsArray', as: 'st', in: "$$st.k"} } } },  // map values into top level of object (didn't work without this for some reason)
        { $unwind: "$serviceTypes" },  // get one entry for each service type
        { $group: { _id: {$toLower: "$serviceTypes"}, service: {$first: "$serviceTypes"}, count: {$sum: 1} } },  // group by service type name, at the same time calculate the sum
        { $sort: {count: -1, service: 1} }  // sort by count DESC, service name ASC
    ],
    GET_ALL_UDF_RUNTIMES_WITH_COUNT_PIPELINE: [
        { $match: { udfRuntimes: {$exists: true} } },  // only consider backends that have UDF runtimes
        { $addFields: { 'udfRuntimesAsArray' : {$objectToArray: '$udfRuntimes' } } },  // UDF runtimes are saved as object keys -> convert to array
        { $project: {udfRuntimes: { $map: {input: '$udfRuntimesAsArray', as: 'rt', in: "$$rt.k"} } } },  // map values into top level of object (didn't work without this for some reason)
        { $unwind: "$udfRuntimes" },  // get one entry for each runtime
        { $group: { _id: {$toLower: "$udfRuntimes"}, runtime: {$first: "$udfRuntimes"}, count: {$sum: 1} } },  // group by runtime name, at the same time calculate the sum
        { $sort: {count: -1, runtime: 1} }  // sort by count DESC, runtime name ASC
    ]
};
