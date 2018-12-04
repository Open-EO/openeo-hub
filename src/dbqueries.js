module.exports = {
    GET_ALL_COLLECTIONS_PIPELINE: [
        { $match: { path: '/collections' } },
        { $addFields: { 'content.collections.backend': '$backend', 'content.collections.retrieved': '$retrieved' } },
        { $project: { 'collection': '$content.collections' } },
        { $unwind: '$collection' },
        { $replaceRoot: {newRoot: '$collection'} }
    ],
    GET_ALL_PROCESSES_PIPELINE: [
        // basically like for collections
        { $match: { path: '/processes' } },
        { $addFields: { 'content.processes.backend': '$backend', 'content.processes.retrieved': '$retrieved' } },
        { $project: { 'process': '$content.processes' } },
        { $unwind: '$process' },
        { $replaceRoot: {newRoot: '$process'} },
        // convert `parameters` object to array because otherwise we can't search for parameter descriptions (MongoDB doesn't support wildcards for object keys)
        { $addFields: { 'parametersAsArray' : { $objectToArray: '$parameters' }}}
    ]
};
