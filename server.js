var restify = require('restify');
var server = restify.createServer();

server.use(restify.plugins.queryParser({ mapParams: false }));
server.use(restify.plugins.bodyParser({ mapParams: false }));

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const dbUrl = 'mongodb://localhost:27017';
const dbName = 'openeohub';

var request = require('request');

const backends = ['http://giv-openeo.uni-muenster.de:8080/v0.3', 'http://localhost:8000'];
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
    return MongoClient.connect(dbUrl, { useNewUrlParser: true }).then(client => {
        return client.db(dbName).collection('backends');
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

// trigger crawling
server.get('/crawl', function(req, res, next) {
    MongoClient.connect(dbUrl, function(err, client) {
        assert.equal(null, err);
        console.log('Connected successfully to server');
      
        const db = client.db(dbName);
        const collection = db.collection('backends');

        backends.forEach(backend => {
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
    res.send(backends);
    return next();
});

// search backends via parameters in URL query string
// only supports `version` parameter
server.get('/backends/search', function(req, res, next) {
    find({"content.version": req.query.version}).then(cursor => {
       try {
           var backendList = [];
           cursor
               .map(b => b.backend)
               .forEach(b => backendList.push(b))
               .then(() => res.send(backendList))
               .catch(error => res.send(error));
       }
       catch(error) {
           res.send(error);
       }
   })
   .catch(error => res.send(error));
});

// search backends via JSON document in POST body
// supports all parameters, which are currently: version, endpoints, collections, processes, processGraph
server.post('/backends/search', async function(req, res, next) {
    // INIT
    var criteria = {path: '/'};

    // VERSION
    if(req.body.version) {
        criteria["content.version"] = req.body.version;
    }

    // ENDPOINTS
    if(req.body.endpoints) {
        criteria["$and"] = req.body.endpoints.map(e => ({
            "content.endpoints": {
                $elemMatch: {
                    path: e.split(' ')[1],
                    methods: e.split(' ')[0]
                }
            }
        }));
    }

    // get all backends that match the criteria that are validated against the '/' document
    var backendsWithCriteria = await (await find(criteria)).toArray();

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
            "$and": req.body.collections.map(c => ({"content.collections.name": c}))
        };
        // get all backends that match the criteria that are validated against the '/collections' document
        var backendsWithCollections = await (await find(collectionCriteria)).toArray();
        // only keep those that match both the previous and the '/collections' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithCollections.some(b2 => b1.backend == b2.backend));
    }

    // PROCESSES
    if(req.body.processes) {
        var processCriteria = {
            "path":"/processes",
            "$and": req.body.processes.map(p => ({"content.processes.name": p}))
        };
        // get all backends that match the criteria that are validated against the '/processes' document
        var backendsWithProcesses = await (await find(processCriteria)).toArray();
        // only keep those that match both the previous and the '/processes' criteria
        backendsWithCriteria = backendsWithCriteria.filter(b1 => backendsWithProcesses.some(b2 => b1.backend == b2.backend));
    }

    // send end result
    res.send(backendsWithCriteria);
});

// proxy backends
server.get('/backends/:backend/*', function(req, res, next) {
    findOne({backend: req.params.backend, path: '/'+req.params['*']}).then(r => res.send(r));
    return next();
});

// serve website (UI)
server.get('/*', restify.plugins.serveStatic({
    directory: './dist',
    default: 'index.html'
}));

server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});