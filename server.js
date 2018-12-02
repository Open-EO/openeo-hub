var restify = require('restify');
var server = restify.createServer();

server.use(restify.plugins.queryParser({ mapParams: false }));
server.use(restify.plugins.bodyParser({ mapParams: false }));

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

var request = require('request');

const config = require('./config.json');
const endpoints = ['/', '/collections', '/processes', '/output_formats', '/service_types'];

function saveToDb(collection, backend, path, data) {
    collection.insertOne({
        backend: backend,
        path: path,
        retrieved: new Date().toJSON(),
        content: data
    });
}

function getCollection() {
    return MongoClient.connect(config.dbUrl, { useNewUrlParser: true }).then(client => {
        return client.db(config.dbName).collection('backends');
    });
}

function findOne(findCriteria) {
    return getCollection().then(collection => collection.findOne(findCriteria));
}

function find(findCriteria, projection = undefined) {
    return getCollection().then(collection => collection.find(findCriteria));
}

function aggregate(pipeline) {
    return getCollection().then(collection => collection.aggregate(pipeline));
}

async function getAllDocsFromCursor(cursor, mappingCallback = undefined) {
    var list = [];
    await cursor.map(mappingCallback || (x => x)).forEach(x => list.push(x));
    return list;
}

// trigger crawling
server.get('/crawl', function(req, res, next) {
    MongoClient.connect(config.dbUrl, function(err, client) {
        assert.equal(null, err);
        console.log('Connected successfully to server');
      
        const db = client.db(config.dbName);
        const collection = db.collection('backends');

        config.backends.forEach(backend => {
            endpoints.forEach(endpoint => {
                request(backend+endpoint, function(err, response, json) {
                    const data = JSON.parse(json);
                    saveToDb(collection, backend, endpoint, data);
                    
                    // fetch the collection details
                    if(endpoint == '/collections') {
                        data.collections.forEach((coll) => {
                            request(backend+'/collections/'+coll.name, function(err, response, json) {
                                saveToDb(collection, backend, '/collections/'+coll.name, JSON.parse(json));     
                            });
                        });    
                    }
                });
            });
        });
        res.send('done');
    });
    
    return next();
});

// list backends
server.get('/backends', function(req, res, next) {
    res.send(config.backends);
    return next();
});

// search backends via parameters in URL query string
// only supports `version` parameter
server.get('/backends/search', function(req, res, next) {
    const criteria = (req.query.version ? {'content.version': req.query.version} : {path: '/'});
    find(criteria).then(async cursor => {
        res.send(await getAllDocsFromCursor(cursor, b => b.backend));
    })
   .catch(error => res.send(error));
});

// search backends via JSON document in POST body
// supports all parameters, which are currently: version, endpoints, collections, processes, processGraph, outputFormats, processTypes, excludePaidOnly
server.post('/backends/search', async function(req, res, next) {
    // INIT
    var criteria = {path: '/'};

    // VERSION
    if(req.body.version) {
        criteria["content.version"] = req.body.version;
    }

    // ENDPOINTS
    if(req.body.endpoints) {
        // the backend must support every requested endpoint -> join with $and
        criteria["$and"] = req.body.endpoints.map(e => {
            // given as string in the format: "METHOD /endpoint"
            const parts = e.split(' ');
            const method = parts[0];
            const path = parts[1];
            return {
                "content.endpoints": {
                    // matches when the "element in the array field matches all specified conditions"
                    $elemMatch: {
                        methods: method,
                        // if path contains parameters: use regex and allow arbitrary parameter names
                        path: (path.indexOf('{') == -1 ? path : { $regex: path.replace(/{[^}]+}/g, '{[^}]+}') })
                    }
                }
            }
        });
    }

    // EXCLUDE PAID ONLY
    if(req.body.excludePaidOnly) {
        criteria['content.billing.plans.name'] = 'free';
    }

    // get all backends that match the criteria that are validated against the '/' document
    var backendsWithCriteria = await (await find(criteria)).toArray();

    // cleanup response object (add version and endpoints to root scope, remove all other unnecessary properties)
    backendsWithCriteria = backendsWithCriteria.map(b => {
        b.version = b.content.version;
        // endpoints in `"METHOD /path"` format like in the request
        b.endpoints = req.body.endpoints;
        // endpoints in `{path:'/path', methods:['METHOD']}` format like in the openEO API spec
        //b.endpoints = b.content.endpoints.filter(e => req.body.endpoints.some(x => e.path == x.split(' ')[1] && e.methods.indexOf(x.split(' ')[0]) != -1));
        delete b.content;
        delete b.path;
        return b;
    });

    // PROCESSGRAPH
    // check process graph = check if backend provides all of its processes and collections
    // -> add process graph's collections and processes to the checks that will be carried out later anyway
    if(req.body.processGraph) {
        // work with Sets so the list won't have duplicates
        var pgCollections = new Set(req.body.collections);
        var pgProcesses = new Set(req.body.processes);

        var recursivelyAddPgCollectionsAndProcesses = pgPart => {
            if(pgPart.process_id) {
                pgProcesses.add(pgPart.process_id);
            }
            // this works for the earthengine-driver, but I'm not sure whether this `get_collection` process is standardized
            if(pgPart.process_id == 'get_collection' && pgPart.name) {
                pgCollections.add(pgPart.name);
            }
            for(var pgSubPart in pgPart) {
                if(typeof pgPart[pgSubPart] == 'object') {
                    recursivelyAddPgCollectionsAndProcesses(pgPart[pgSubPart]);
                }
            }
        };
        recursivelyAddPgCollectionsAndProcesses(req.body.processGraph);

        // only touch req.body if we have to
        if(pgCollections.size > 0) {
            // if there were no collections yet we can straightforwardly assign the ones we've got now
            if(!req.body.collections) {
                req.body.collections = [...pgCollections];  // spread Set as Array
            // otherwise we have to combine the old and the new
            } else {
                req.body.collections.forEach(c => pgCollections.add(c));  // add to Set for deduplication
                req.body.collections = [...pgCollections];  // spread Set as Array
            }
        }

        if(pgProcesses.size > 0) {
            if(!req.body.processes) {
                req.body.processes = [...pgProcesses];
            } else {
                req.body.processes.forEach(p => pgProcesses.add(p));
                req.body.processes = [...pgProcesses];
            }
        }
    }
    
    // COLLECTIONS
    if(req.body.collections) {
        var collectionCriteria = {
            "path":"/collections",
            "$and": req.body.collections.map(c => ({"content.collections.name": {$regex: c, $options: 'i'}}))
        };
        // get all backends that match the criteria that are validated against the '/collections' document
        var backendsWithCollections = await (await find(collectionCriteria)).toArray();
        // only keep those that match both the previous and the '/collections' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithCollections.some(b2 => b1.backend == b2.backend));
        // add metadata of queried collections to response object
        backendsWithCriteria = backendsWithCriteria.map(b => 
            Object.assign(b, { collections: backendsWithCollections
                .find(el => el.backend == b.backend)
                .content
                .collections
                .filter(c => req.body.collections.some(s => c.name.match(new RegExp(s, 'i')) != null))
            })
        );
    }

    // PROCESSES
    if(req.body.processes) {
        var processCriteria = {
            "path":"/processes",
            "$and": req.body.processes.map(p => ({"content.processes.name": {$regex: p, $options: 'i'}}))
        };
        // get all backends that match the criteria that are validated against the '/processes' document
        var backendsWithProcesses = await (await find(processCriteria)).toArray();
        // only keep those that match both the previous and the '/processes' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithProcesses.some(b2 => b1.backend == b2.backend));
        // add metadata of queried processes to response object
        backendsWithCriteria = backendsWithCriteria.map(b => 
            Object.assign(b, { processes: backendsWithProcesses
                .find(el => el.backend == b.backend)
                .content
                .processes
                .filter(p => req.body.processes.some(s => p.name.match(new RegExp(s, 'i')) != null))
            })
        );
    }

    // OUTPUT FORMATS
    if(req.body.outputFormats) {
        var outputFormatCriteria = {
            "path":"/output_formats"
        };
        // output format identifiers aren't array items but object keys, so check for $exists
        req.body.outputFormats.forEach(of => outputFormatCriteria['content.formats.'+of] = {$exists: true});
        // get all backends that match the criteria that are validated against the '/output_formats' document
        var backendsWithOutputFormats = await (await find(outputFormatCriteria)).toArray();
        // only keep those that match both the previous and the '/output_formats' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithOutputFormats.some(b2 => b1.backend == b2.backend));
        // add metadata of queried output formats to response object
        backendsWithCriteria = backendsWithCriteria.map(b => {
            var result = Object.assign(b, { outputFormats: {} });
            req.body.outputFormats.forEach(of => 
                result.outputFormats[of] = backendsWithOutputFormats.find(el => el.backend == b.backend).content.formats[of]
            );
            return b;
        });
    }

    // SERVICE TYPES
    if(req.body.serviceTypes) {
        var serviceTypeCriteria = {
            "path":"/service_types"
        };
        // output format identifiers aren't array items but object keys, so check for $exists
        req.body.serviceTypes.forEach(st => serviceTypeCriteria['content.'+st] = {$exists: true});
        // get all backends that match the criteria that are validated against the '/service_types' document
        var backendsWithServiceTypes = await (await find(serviceTypeCriteria)).toArray();
        // only keep those that match both the previous and the '/output_formats' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithServiceTypes.some(b2 => b1.backend == b2.backend));
        // add metadata of queried service types to response object
        backendsWithCriteria = backendsWithCriteria.map(b => {
            var result = Object.assign(b, { serviceTypes: {} });
            req.body.serviceTypes.forEach(st => 
                result.serviceTypes[st] = backendsWithServiceTypes.find(el => el.backend == b.backend).content[st]
            );
            return b;
        });
    }

    // send end result
    res.send(backendsWithCriteria);
});

// proxy backends
server.get('/backends/:backend/*', function(req, res, next) {
    findOne({backend: req.params.backend, path: '/'+req.params['*']}).then(r => res.send(r));
    return next();
});

const GET_ALL_COLLECTIONS_PIPELINE = [
    { $match: { path: '/collections' } },
    { $addFields: { 'content.collections.backend': '$backend', 'content.collections.retrieved': '$retrieved' } },
    { $project: { 'collection': '$content.collections' } },
    { $unwind: '$collection' }
];

// list collections
server.get('/collections', function(req, res, next) {
    aggregate(GET_ALL_COLLECTIONS_PIPELINE).then(async cursor => {
        res.send(await getAllDocsFromCursor(cursor));
    })
    .catch(error => res.send(error));
});

// search collections via JSON document in POST body
// supports all parameters, which are currently: name, title, description, extent (spatial and temporal)
server.post('/collections/search', async function(req, res, next) {
    // INIT
    var pipeline = Array.from(GET_ALL_COLLECTIONS_PIPELINE);  // copy the array so we don't overwrite the constant
    var criteria = {};
    
    // NAME
    if(req.body.name) {
        criteria['collection.name'] = {$regex: req.body.name, $options: 'i'};
    }

    // TITLE
    if(req.body.title) {
        criteria['collection.title'] = {$regex: req.body.title, $options: 'i'};
    }

    // DESCRIPTION
    if(req.body.description) {
        criteria['collection.description'] = {$regex: req.body.description, $options: 'i'};
    }

    // EXTENT
    if(req.body.extent) {
        // SPATIAL
        if(req.body.extent.spatial) {
            // inspired by https://github.com/morganherlocker/bbox-intersect
            /*criteria['$not'] = {
                '$or': {
                    'collection.extent.spatial.0': {$gt: req.body.extent.spatial[2]},
                    'collection.extent.spatial.2': {$lt: req.body.extent.spatial[0]},
                    'collection.extent.spatial.1': {$gt: req.body.extent.spatial[3]},
                    'collection.extent.spatial.3': {$lt: req.body.extent.spatial[1]},
                }
            }*/
            // $not can't be used like that, so rewrite as:
            criteria['$and'] = [
                {'collection.extent.spatial.0': {$lte: req.body.extent.spatial[2]}},
                {'collection.extent.spatial.2': {$gte: req.body.extent.spatial[0]}},
                {'collection.extent.spatial.1': {$lte: req.body.extent.spatial[3]}},
                {'collection.extent.spatial.3': {$gte: req.body.extent.spatial[1]}},
            ]
        }

        // TEMPORAL
        if(req.body.extent.temporal) {
            if(req.body.extent.temporal[0] != null) {
                criteria['collection.extent.temporal.0'] = {$lte: req.body.extent.temporal[0]};
            }
            if(req.body.extent.temporal[1] != null) {
                criteria['collection.extent.temporal.1'] = {$gte: req.body.extent.temporal[1]};
            }
        }
    }

    // add the match stage to the collection pipeline
    pipeline.push({$match: criteria});
    // execute pipeline
    var collectionsWithCriteria = await (await aggregate(pipeline)).toArray();
    // send end result
    res.send(collectionsWithCriteria);
});

const GET_ALL_PROCESSES_PIPELINE = [
    // basically like for collections
    { $match: { path: '/processes' } },
    { $addFields: { 'content.processes.backend': '$backend', 'content.processes.retrieved': '$retrieved' } },
    { $project: { 'process': '$content.processes' } },
    { $unwind: '$process' },
    // convert parameters object to array because otherwise we can't search for parameter descriptions (MongoDB doesn't support wildcards for object keys)
    { $addFields: { 'process.parametersAsArray' : { $objectToArray: '$process.parameters' }}}
];

// list processes
server.get('/processes', function(req, res, next) {
    aggregate(GET_ALL_PROCESSES_PIPELINE).then(async cursor => {
        res.send(await getAllDocsFromCursor(cursor));
    })
    .catch(error => res.send(error));
});

// search processes via JSON document in POST body
// supports all parameters, which are currently: name, summary, description, excludeDeprecated, parameterNames, parameterDescriptions
server.post('/processes/search', async function(req, res, next) {
    // INIT
    var pipeline = Array.from(GET_ALL_PROCESSES_PIPELINE);  // copy the array so we don't overwrite the constant
    var criteria = {};
    
    // NAME
    if(req.body.name) {
        criteria['process.name'] = {$regex: req.body.name, $options: 'i'};
    }

    // SUMMARY
    if(req.body.summary) {
        criteria['process.summary'] = {$regex: req.body.summary, $options: 'i'};
    }

    // DESCRIPTION
    if(req.body.description) {
        criteria['process.description'] = {$regex: req.body.description, $options: 'i'};
    }

    // EXCLUDE DEPRECATED
    if(req.body.excludeDeprecated) {
        criteria['process.deprecated'] = {$exists: false};
    }

    // PARAMETER NAMES
    if(req.body.parameterNames) {
        req.body.parameterNames.forEach(p => {criteria['process.parametersAsArray.k'] = {$regex: p, $options: 'i'}});
    }

    // PARAMETER DESCRIPTIONS
    if(req.body.parameterDescriptions) {
        req.body.parameterDescriptions.forEach(p => {criteria['process.parametersAsArray.v.description'] = {$regex: p, $options: 'i'}});
    }

    // add the match stage to the process pipeline
    pipeline.push({$match: criteria});
    // execute pipeline
    var processesWithCriteria = await (await aggregate(pipeline)).toArray();
    // send end result
    res.send(processesWithCriteria);
});

// serve website (UI)
server.get('/*', restify.plugins.serveStatic({
    directory: './dist',
    default: 'index.html'
}));

server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});
