const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const request = require('request');

function saveToDb(collection, backend, path, data) {
    collection.insertOne({
        backend: backend,
        path: path,
        retrieved: new Date().toJSON(),
        content: data
    });
}

MongoClient.connect(config.dbUrl, function(err, client) {
    assert.equal(null, err);
    console.log('Connected successfully to server');
  
    const db = client.db(config.dbName);
    const collection = db.collection('backends');
    const endpoints = ['/', '/collections', '/processes', '/output_formats', '/service_types'];

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
    console.log('done');
});
