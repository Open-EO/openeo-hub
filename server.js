const PACKAGEJSON = require('./package.json');
const config = require('./config.json');

const dbqueries = require('./src/dbqueries.js');

const mongodb = require('mongodb');
const mongo = new mongodb.MongoClient(config.dbUrl, { useNewUrlParser: true } );
var db;
mongo.connect().then(client => db = client.db(config.dbName));

var restify = require('restify');
var server = restify.createServer();
server.use(restify.plugins.queryParser({ mapParams: false }));
server.use(restify.plugins.bodyParser({ mapParams: false }));


// -------------------------------------------------------------------------------------
// Wrappers for MongoDB functions
// `getCollection` returns a Collection, every other function returns a Promise
// -------------------------------------------------------------------------------------

function getCollection(collectionName = 'raw') {
    return db.collection(collectionName);
}

function insertOne(data, collectionName) {
    return getCollection(collectionName).insertOne(data);
}

function findOne(findCriteria, collectionName) {
    return getCollection(collectionName).findOne(findCriteria);
}

function find(findCriteria, collectionName) {
    if(findCriteria.$text) {
        // sort by text search score if criteria contain a fulltext search
        return getCollection(collectionName)
            .find(findCriteria)
            .project({ fulltextSearchScore: {$meta:"textScore"} })
            .sort({ fulltextSearchScore: {$meta:"textScore"} })
            .toArray();
    } else {
        // don't sort anything if there's no fulltext search involved
        return getCollection(collectionName).find(findCriteria).toArray();
    }
}

function aggregate(pipeline, collectionName) {
    return getCollection(collectionName).aggregate(pipeline).toArray();
}


// -------------------------------------------------------------------------------------
// Helper function for preparing the result before sending
// -------------------------------------------------------------------------------------

// parameter `data` may be a Promise or not
function prepare(data, additionalCallbacks = []) {
    function removeMongoDBID(item) {
        delete item._id;
        return item;
    }

    function addBackendTitle(item) {
        if(typeof item.backend == 'string') {
            item.backendUrl = item.backend;
            item.backendTitle = item.backendTitle;
            delete item.backend;
        }
        return item;
    }

    let callbacks = [removeMongoDBID, addBackendTitle].concat(additionalCallbacks);
    
    const apply = (dataResolved) => {
        if(Array.isArray(dataResolved)) {
            callbacks.forEach(cb => dataResolved = dataResolved.map(cb));
            return dataResolved;
        } else {
            callbacks.forEach(cb => dataResolved = cb.call(this, dataResolved));
            return dataResolved;
        }
    };

    if(data instanceof Promise) {
        return data.then(apply);
    } else {
        return apply(data);
    }
}

function enableCORS(req, res) {
    res.header('Vary', 'Origin');
    if(req.headers.origin) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
    }
}

// -------------------------------------------------------------------------------------
// Actual handlers for the endpoints
// -------------------------------------------------------------------------------------

// list backends
server.get('/api/backends', function(req, res, next) {
    enableCORS(req, res);
    if(!req.query.details) {
        res.send(config.backends);
        next();
    } else {
        const clip = b => {
            if(b.collections) { b.collections = b.collections.map(e => ({name: e.name || e.id})); }
            if(b.processes) { b.processes = b.processes.map(e => ({name: e.name || e.id})); }
            return b;
        };

        if(req.query.details == 'grouped') {
            aggregate([{ $group: {_id: "$group", name: {$first: "$group"}, url: {$first: "$backend"}, backends: {$push: "$$ROOT"}}}], 'backends')
                .then(data => data.map(g => { g.backends = g.backends.map(b => prepare(b, [clip])); return g; }))
                .then(data => { res.send(data); next(); })
                .catch(err => next(err));
        } else {
            find({}, 'backends')
                .then(data => prepare(data, (req.query.details == 'clipped' ? [clip] : [])))
                .then(data => { res.send(data); next(); })
                .catch(err => next(err));
        }
    }
});

// return details of a single backend
server.get('/api/backends/:backend', function(req, res, next) {
    findOne({backend: decodeURIComponent(req.params.backend)}, 'backends')  // manual decoding due to double-encoding (see Backend.vue#171 as of 2019-07-17)
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// return collection details of a single backend
server.get('/api/backends/:backend/collections', function(req, res, next) {
    findOne({backend: decodeURIComponent(req.params.backend)}, 'backends')  // manual decoding due to double-encoding (see Backend.vue#171 as of 2019-07-17)
        .then(prepare)
        .then(data => { res.send(data.collections); next(); })
        .catch(err => next(err));
});

// return process details of a single backend
server.get('/api/backends/:backend/processes', function(req, res, next) {
    findOne({backend: decodeURIComponent(req.params.backend)}, 'backends')  // manual decoding due to double-encoding (see Backend.vue#171 as of 2019-07-17)
        .then(prepare)
        .then(data => { res.send(data.processes); next(); })
        .catch(err => next(err));
});

// search backends via JSON document in POST body
// supports all parameters, which are currently: version, endpoints, collections, processes, processGraph, outputFormats, processTypes, excludePaidOnly
server.post('/api/backends/search', async function(req, res, next) {
    // INIT
    var criteria = {path: '/'};

    // VERSION
    if(req.body.version) {
        criteria["$or"] = [  // in v0.3.x the property was called "version", in 0.4.x "api_version"
            {"content.version": req.body.version},
            {"content.api_version": req.body.version}
        ];
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
                        $or: [ {methods: method.toLowerCase()}, {methods: method.toUpperCase()} ],  // case-insensitive
                        // if path contains parameters: use regex and allow arbitrary parameter names
                        path: (path.indexOf('{') == -1 ? path : { $regex: path.replace(/{[^}]*}/g, '{[^}]*}') })
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
    var backendsWithCriteria = await find(criteria);

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
            // get_collection + name for v0.3.x process graphs, load_collection + id for v0.4.x
            if((pgPart.process_id == 'get_collection' && pgPart.name) || (pgPart.process_id == 'load_collection' && pgPart.arguments && pgPart.arguments.id)) {
                pgCollections.add(pgPart.name || pgPart.arguments.id);
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
            "$and": req.body.collections.map(c => ({
                "$or": [
                    {"content.collections.name": {$regex: c, $options: 'i'}},
                    {"content.collections.id": {$regex: c, $options: 'i'}}   // `name` changed to `id` in API v0.4
                ]
            }))
        };
        // get all backends that match the criteria that are validated against the '/collections' document
        var backendsWithCollections = await find(collectionCriteria);
        // only keep those that match both the previous and the '/collections' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithCollections.some(b2 => b1.backend == b2.backend));
        // add metadata of queried collections to response object
        backendsWithCriteria = backendsWithCriteria.map(b => 
            Object.assign(b, { collections: backendsWithCollections
                .find(el => el.backend == b.backend)
                .content
                .collections
                .filter(c => req.body.collections.some(s => (c.name || c.id).match(new RegExp(s, 'i')) != null))
            })
        );
    }

    // PROCESSES
    if(req.body.processes) {
        var processCriteria = {
            "path":"/processes",
            "$and": req.body.processes.map(p => ({
                "$or": [
                    {"content.processes.name": {$regex: p, $options: 'i'}},
                    {"content.processes.id": {$regex: p, $options: 'i'}}  // `name` changed to `id` in API v0.4
                ]
            }))
        };
        // get all backends that match the criteria that are validated against the '/processes' document
        var backendsWithProcesses = await find(processCriteria);
        // only keep those that match both the previous and the '/processes' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithProcesses.some(b2 => b1.backend == b2.backend));
        // add metadata of queried processes to response object
        backendsWithCriteria = backendsWithCriteria.map(b => 
            Object.assign(b, { processes: backendsWithProcesses
                .find(el => el.backend == b.backend)
                .content
                .processes
                .filter(p => req.body.processes.some(s => (p.name || p.id).match(new RegExp(s, 'i')) != null))
            })
        );
    }

    // OUTPUT FORMATS
    if(req.body.outputFormats) {
        var outputFormatCriteria = {
            "path":"/output_formats"
        };
        outputFormatCriteria["$and"] = req.body.outputFormats.map(of => {
            // difference between v0.3.x and v0.4.x: In the former, the formats were within a `formats` property - in the latter, they are in the root.
            let v03 = {};
            let v04 = {};
            v03['content.formats.'+of] = {$exists: true};  // output format identifiers aren't array items but object keys, so check for $exists
            v04['content.'+of] = {$exists: true};
            return { $or: [v03, v04] };
        });
        // get all backends that match the criteria that are validated against the '/output_formats' document
        var backendsWithOutputFormats = await find(outputFormatCriteria);
        // only keep those that match both the previous and the '/output_formats' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithOutputFormats.some(b2 => b1.backend == b2.backend));
        // add metadata of queried output formats to response object
        backendsWithCriteria = backendsWithCriteria.map(b => {
            var result = Object.assign(b, { outputFormats: {} });
            req.body.outputFormats.forEach(of => {
                const found = backendsWithOutputFormats.find(el => el.backend == b.backend);
                result.outputFormats[of] = found.content[of] || found.content.formats[of];
            });
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
        var backendsWithServiceTypes = await find(serviceTypeCriteria);
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
    res.send(prepare(backendsWithCriteria));
    next();
});

// proxy backends
server.get('/api/backends/:backend/*', function(req, res, next) {
    findOne({backend: req.params.backend, path: '/'+req.params['*']})
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// list collections
server.get('/api/collections', function(req, res, next) {
    find({}, 'collections')
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// search collections via JSON document in POST body
// supports all parameters, which are currently: name, title, description, fulltext, bbox (aka spatial extent), startdate and enddate (aka temporal extent)
server.post('/api/collections/search', async function(req, res, next) {
    // INIT
    var criteria = {};
    
    // NAME
    if(req.body.name) {
        criteria['$or'] = [
            {'name': {$regex: req.body.name, $options: 'i'}},
            {'id': {$regex: req.body.name, $options: 'i'}}   // `name` changed to `id` in API v0.4
        ];
    }

    // TITLE
    if(req.body.title) {
        criteria['title'] = {$regex: req.body.title, $options: 'i'};
    }

    // DESCRIPTION
    if(req.body.description) {
        criteria['description'] = {$regex: req.body.description, $options: 'i'};
    }

    // FULLTEXT
    if(req.body.fulltext) {
        criteria['$text'] = {$search: req.body.fulltext};
    }

    // BBOX aka SPATIAL EXTENT
    if(req.body.bbox) {
        // inspired by https://github.com/morganherlocker/bbox-intersect
        // (But rewritten without a NOT because $not can't be top-level in MongoDB. The rules are implicitly connected with AND by MongoDB.)
        criteria['extent.spatial.0'] = {$lte: req.body.bbox[2]};
        criteria['extent.spatial.2'] = {$gte: req.body.bbox[0]};
        criteria['extent.spatial.1'] = {$lte: req.body.bbox[3]};
        criteria['extent.spatial.3'] = {$gte: req.body.bbox[1]};
    }

    // STARTDATE aka TEMPORAL EXTENT PART 1 / INDEX 0
    if(req.body.startdate !== undefined) {  // can be `null` -> strict equality test against `undefined`
        if(req.body.startdate === null) {
            criteria['extent.temporal.0'] = {$eq: null};
        } else {
            criteria['$or'] = [{'extent.temporal.0': {$lte: req.body.startdate}}, {'extent.temporal.0': {$eq: null}}];
        }
    }

    // ENDDATE aka TEMPORAL EXTENT PART 2 / INDEX 1
    if(req.body.enddate !== undefined) {  // can be `null` -> strict equality test against `undefined`
        if(req.body.enddate === null) {
            criteria['extent.temporal.1'] = {$eq: null};
        } else {
            const enddateCriteria = [{'extent.temporal.1': {$gte: req.body.enddate}}, {'extent.temporal.1': {$eq: null}}];
            // don't overwrite `$or` property that may have already been added by startdate's block
            if(criteria['$or'] == undefined) {
                // safe
                criteria['$or'] = enddateCriteria;
            } else {
                // connect them with an `$and`
                criteria['$and'] = [{$or: criteria['$or']}, {$or: enddateCriteria}];
                // remove the old `$or`
                delete criteria['$or'];
            }
        }
    }
    
    // send end result
    find(criteria, 'collections')
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// list processes
server.get('/api/processes', function(req, res, next) {
    find({}, 'processes')
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// list output formats
server.get('/api/output_formats', function(req, res, next) {
    aggregate(dbqueries.GET_ALL_OUTPUT_FORMATS_WITH_COUNT_PIPELINE, 'backends')
        .then(data => prepare(data))
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// list service types
server.get('/api/service_types', function(req, res, next) {
    aggregate(dbqueries.GET_ALL_SERVICE_TYPES_WITH_COUNT_PIPELINE, 'backends')
        .then(data => prepare(data))
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// search processes via JSON document in POST body
// supports all parameters, which are currently: name, summary, description, fulltext, excludeDeprecated, parameterNames, parameterDescriptions
server.post('/api/processes/search', async function(req, res, next) {
    // INIT
    var criteria = {};
    
    // NAME
    if(req.body.name) {
        criteria['$or'] = [
            {'name': {$regex: req.body.name, $options: 'i'}},
            {'id': {$regex: req.body.name, $options: 'i'}}   // `name` changed to `id` in API v0.4
        ];
    }

    // SUMMARY
    if(req.body.summary) {
        criteria['summary'] = {$regex: req.body.summary, $options: 'i'};
    }

    // DESCRIPTION
    if(req.body.description) {
        criteria['description'] = {$regex: req.body.description, $options: 'i'};
    }

    // FULLTEXT
    if(req.body.fulltext) {
        criteria['$text'] = {$search: req.body.fulltext};
    }

    // EXCLUDE DEPRECATED
    if(req.body.excludeDeprecated) {
        criteria['deprecated'] = {$exists: false};
    }

    // PARAMETER NAMES
    if(req.body.parameterNames) {
        req.body.parameterNames.forEach(p => {criteria['parametersAsArray.k'] = {$regex: p, $options: 'i'}});
    }

    // PARAMETER DESCRIPTIONS
    if(req.body.parameterDescriptions) {
        req.body.parameterDescriptions.forEach(p => {criteria['parametersAsArray.v.description'] = {$regex: p, $options: 'i'}});
    }

    // send end result
    find(criteria, 'processes')
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// handle CORS preflight for POSTing
server.opts('/api/process_graphs', function(req, res, next) {
    enableCORS(req, res);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.send();
});

// compliant to openEO API 0.4.2
server.get('/api/process_graphs', function(req, res, next) {
    enableCORS(req, res);
    find({}, 'process_graphs')
        .then(data => { data.forEach(e => e.id = e._id); return data; })
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// compliant to openEO API 0.4.2
server.post('/api/process_graphs', function(req, res, next) {
    enableCORS(req, res);
    if(req.getContentType() != 'application/json') {
        res.statusCode = 415;
        res.send({message: "Only JSON allowed"});
        next();
    } else if(typeof req.body.process_graph != 'string' || req.body.process_graph == '') {
        res.statusCode = 422;
        res.send({message: "JSON must contain a process_graph property that holds a non-empty string"});
        next();
    // invalid JSON is handled automatically
    } else {
        insertOne(req.body, 'process_graphs')
        .then(mongoreply => {
            if(mongoreply.result.ok == 1 && mongoreply.result.n == 1) {
                res.statusCode = 201;
                res.header('OpenEO-Identifier', mongoreply.insertedId);
                res.header('Location', '/process_graphs/'+mongoreply.insertedId);
                res.send();
                next();
            } else {
                res.send(mongoreply);
                next();
            }
        })
        .catch(err => next(err));
    }
});

// compliant to openEO API 0.4.2
server.get('/api/process_graphs/:id', function(req, res, next) {
    enableCORS(req, res);
    findOne(mongodb.ObjectId(req.params.id), 'process_graphs')
        .then(pg => {
            if(pg) {
                pg.id = pg._id;
                delete pg._id;
                res.send(pg);
                next();
            } else {
                res.statusCode = 404;
                res.send({message: "Not Found"});
                next();
            }
        })
        .catch(err => next(err));
});

server.get('/api', function(req, res, next) {
    res.send({
        api_version: '0.4.2',
        backend_version: PACKAGEJSON.version,
        title: 'openEO Hub',
        description: PACKAGEJSON.description,
        endpoints: [
            { path: '/backends', methods: ['GET'] },
            { path: '/process_graphs', methods: ['GET', 'POST'] },
            { path: '/process_graphs/{process_graph_id}', methods: ['GET'] }
        ]
    });
});

// serve website (UI)
server.get('/*', restify.plugins.serveStatic({
    directory: './dist',
    default: 'index.html'
}));


// -------------------------------------------------------------------------------------
// Start server
// -------------------------------------------------------------------------------------

server.listen(9000, function() {
    console.log('%s listening at %s', server.name, server.url);
});
