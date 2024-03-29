const PACKAGEJSON = require('./package.json');
const config = require('./config.json');

const dbqueries = require('./src/dbqueries.js');

const mongodb = require('mongodb');
var db;

const restify = require('restify');
var server;

const {ProcessRegistry, ProcessGraph} = require('@openeo/js-processgraphs');

// -------------------------------------------------------------------------------------
// Start server
// -------------------------------------------------------------------------------------

console.log('Starting the server...');
server = restify.createServer();   // This must be in the root scope (not in the `mongo.connect()`'s `then` handler function) so that calls to `server` further down in the script work no matter whether the database is already there or not.
console.log('Connecting to the database...');
const mongo = new mongodb.MongoClient(config.dbUrl, { useNewUrlParser: true, useUnifiedTopology: true } );
mongo.connect()
.then(client => {
    db = client.db(config.dbName);
    console.log('Connected.');
    
    server.listen(9000, function() {
        console.log('Server started at %s.', server.url);
    });
})
.catch(error => {
    console.error('An error occurred while connecting to the database server!');
    console.error('Did you configure the dbUrl correctly in the config.json and is that server running and reachable?');
    console.error('The error was: ' + error.name + ': ' + error.message + ')');
    console.error('EXITING because a database connection is crucial for the Hub.');
    process.exit(1);
});


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


// -------------------------------------------------------------------------------------
// Helper function for dealing with CORS preflight stuff
// -------------------------------------------------------------------------------------

function enableCORS(req, res) {
    res.header('Vary', 'Origin');
    if(req.headers.origin) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
    }
}


// -------------------------------------------------------------------------------------
// Handlers for all endpoints
// -------------------------------------------------------------------------------------

// Easy access to URL parameters and payload content
server.use(restify.plugins.queryParser({ mapParams: false }));
server.use(restify.plugins.bodyParser({ mapParams: false }));

// Prevent crashing when URL contains nullbytes (see https://github.com/restify/node-restify/issues/1864)
server.pre((req, res, next) => {
    req.url = req.url.replace(/%00|\u0000/g, '');
    next();
});


// -------------------------------------------------------------------------------------
// Actual handlers for the individual endpoints
// -------------------------------------------------------------------------------------

// list backends
server.get('/api/backends', function(req, res, next) {
    enableCORS(req, res);
    if(!req.query.details) {
        res.send(config.backends);
        next();
    } else {
        const clip = b => {
            if(b.collections) { b.collections = b.collections.map(e => ({id: e.id})); }
            if(b.processes) { b.processes = b.processes.map(e => ({id: e.id})); }
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
    find({backend: decodeURIComponent(req.params.backend)}, 'collections')  // manual decoding due to double-encoding (see Backend.vue#171 as of 2019-07-17)
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// return collection details of a specific collection of a single backend
server.get('/api/backends/:backend/collections/:identifier', function(req, res, next) {
    findOne({backend: decodeURIComponent(req.params.backend), path: '/collections/'+decodeURIComponent(req.params.identifier)}, 'raw')  // manual decoding due to double-encoding of params
        .then(prepare)
        .then(data => { res.send(data.content); next(); })
        .catch(err => next(err));
});

// return process details of a single backend
server.get('/api/backends/:backend/processes', function(req, res, next) {
    find({backend: decodeURIComponent(req.params.backend)}, 'processes') // manual decoding due to double-encoding (see Backend.vue#171 as of 2019-07-17)
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// proxy backends
server.get('/api/backends/:backend/*', function(req, res, next) {
    findOne({backend: req.params.backend, path: '/'+req.params['*']})
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// list collections
server.get('/api/collections', function(req, res, next) {
    aggregate(dbqueries.GET_DISTINCT_COLLECTIONS_PIPELINE, 'collections')
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// list processes
server.get('/api/processes', function(req, res, next) {
    aggregate(dbqueries.GET_DISTINCT_PROCESSES_WITH_COUNT_PIPELINE, 'processes')
        .then(prepare)
        .then(data => { res.send(data); next(); })
        .catch(err => next(err));
});

// list input formats
server.get('/api/input_formats', function(req, res, next) {
    aggregate(dbqueries.GET_ALL_INPUT_FORMATS_WITH_COUNT_PIPELINE, 'backends')
        .then(data => prepare(data))
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

// list UDF runtimes
server.get('/api/udf_runtimes', function(req, res, next) {
    aggregate(dbqueries.GET_ALL_UDF_RUNTIMES_WITH_COUNT_PIPELINE, 'backends')
        .then(data => prepare(data))
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

// validates the given `process_graph` for every URL from the `links` array
// compliant to openEO API v1.0.1 (as long as only 1 URL is submitted)
server.post('/api/validation', function(req, res, next) {
    // treat each item of the `links` array as a backend URL and get their data (if available)
    find({backend: {$in: req.body.links.map(b => b.href)}}, 'backends')
        .then(data => {
            
            // for each that was found
            let checks = data.map(b => {
                // construct the ProcessRegistry from the given `process` data
                const pr = new ProcessRegistry(b.processes);
                // and the corresponding ProcessGraph object
                const pg = new ProcessGraph(req.body.process_graph, pr);
                // do the validation (is returned as promise, handle if it fails)
                return pg.validate(false).catch(err => next(err));
            });
            
            // when all promises have resolved
            Promise.all(checks)
            .then(checks => {
                // send out result...
                if(checks.length == 1) {
                    // ...in openEO API spec-compliant format if it's just 1 backend
                    res.send({errors: checks[0]});
                    next();
                } else {
                    // ...as an array if there's more than 1 (not really spec-comliant, but as close as it can get for this case)
                    res.send(checks.map(errlist => ({errors: errlist})));
                    next();
                }
            })
            .catch(err => next(err));

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
