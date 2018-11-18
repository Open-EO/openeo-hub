var restify = require('restify');
var server = restify.createServer();

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const dbUrl = 'mongodb://localhost:27017';
const dbName = 'openeohub';

var request = require('request');

const backends = ['http://giv-openeo.uni-muenster.de:8080/v0.3', 'http://localhost:8000'];
const endpoints = ['/', '/collections', '/processes', '/output_formats', '/service_types'];

server.get('/test', function(req, res, next) {
    res.send('test');
    return next();
});

function saveToDb(collection, backend, path, data) {
    collection.insertOne({
        backend: backend,
        path: path,
        retrieved: new Date().toJSON(),
        content: data
    });
}

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
                                saveToDb(collection, backend, '/collections'+coll.name, JSON.parse(json));     
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

server.get('/*', restify.plugins.serveStatic({
    directory: './public',
    default: 'index.html'
}));

server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});
