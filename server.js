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
            if(b.collections) { b.collections = b.collections.map(e => ({id: e.name || e.id})); }
            if(b.processes) { b.processes = b.processes.map(e => ({id: e.name || e.id})); }
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
