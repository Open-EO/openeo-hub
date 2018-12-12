module.exports = {
    GET_ALL_BACKENDS_PIPELINE: [
        { $match: { path: { $in: ['/', '/collections', '/processes', '/service_types', '/output_formats'] } } },
        // This would be more dynamic and is effectively the same: { $match: { path: { $regex: "^\/[a-z_]*$" } } }
        // But since the endpoints are hardcoded anyway there's no benefit, especially not when considering regex slowness.
        { $group: {
            _id: '$backend',
            backend: { $first: '$backend' },
            retrieved: { $max: '$retrieved' },
            unsuccessfulCrawls: { $max: '$unsuccessfulCrawls' },
            contents: { $push: '$content' },
            paths: {$push: '$path'}
        } },
        { $addFields: {
            root: { $arrayElemAt: [ '$contents', { $indexOfArray: ['$paths', '/'] } ] },
            collections: { $arrayElemAt: [ '$contents', { $indexOfArray: ['$paths', '/collections'] } ] },
            processes: { $arrayElemAt: [ '$contents', { $indexOfArray: ['$paths', '/processes'] } ] },
            outputFormats: { $arrayElemAt: [ '$contents', { $indexOfArray: ['$paths', '/output_formats'] } ] },
            serviceTypes: { $arrayElemAt: [ '$contents', { $indexOfArray: ['$paths', '/service_types'] } ] }
        } },
        { $project: {
            backend: 1,
            retrieved: 1,
            unsuccessfulCrawls: 1,
            version: '$root.version',
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
            outputFormats: '$outputFormats.formats',
            serviceTypes: 1
        } }
    ],
    GET_ALL_COLLECTIONS_PIPELINE: [
        { $match: { path: '/collections' } },
        { $addFields: { 'content.collections.backend': '$backend', 'content.collections.retrieved': '$retrieved' } },
        { $project: { 'collection': '$content.collections' } },
        { $unwind: '$collection' },
        { $replaceRoot: { newRoot: '$collection' } }
    ],
    GET_ALL_PROCESSES_PIPELINE: [
        // basically like for collections
        { $match: { path: '/processes' } },
        { $addFields: { 'content.processes.backend': '$backend', 'content.processes.retrieved': '$retrieved' } },
        { $project: { 'process': '$content.processes' } },
        { $unwind: '$process' },
        { $replaceRoot: {newRoot: '$process'} },
        // convert `parameters` object to array because otherwise we can't search for parameter descriptions (MongoDB doesn't support wildcards for object keys)
        { $addFields: { 'parametersAsArray' : { $objectToArray: '$parameters' } } }
    ]
};
