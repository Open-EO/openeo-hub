var restify = require('restify');
var server = restify.createServer();

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const dbUrl = 'mongodb://localhost:27017';
const dbName = 'openeohub';

var request = require('request');

var backends = ['http://giv-openeo.uni-muenster.de:8080/v0.3', 'http://localhost:8000'];

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
        console.log("Connected successfully to server");
      
        const db = client.db(dbName);
        const collection = db.collection('backends');

        backends.forEach(backend => {
        
            request(backend+'/', function(err, response, data) {
                saveToDb(collection, backend, '/', JSON.parse(data));
            });

            request(backend+'/collections', function(err, response, data) {
                const infos = JSON.parse(data);
                saveToDb(collection, backend, '/collections', infos);
                
                infos.collections.forEach((c) => {
                    request(backend+'/collections/'+c.name, function(err, response, data) {
                        saveToDb(collection, backend, '/collections'+c.name, JSON.parse(data));     
                    });
                });
            });

            request(backend+'/processes', function(err, response, data) {
                saveToDb(collection, backend, '/processes', JSON.parse(data));
            });

            request(backend+'/output_formats', function(err, response, data) {
                saveToDb(collection, backend, '/output_formats', JSON.parse(data));
            });

            request(backend+'/service_types', function(err, response, data) {
                saveToDb(collection, backend, '/service_types', JSON.parse(data));
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
