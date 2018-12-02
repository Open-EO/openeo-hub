const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const axios = require('axios');

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
            axios(backend+endpoint).then(response => {
                saveToDb(collection, backend, endpoint, response.data);
                
                // fetch the collection details
                if(endpoint == '/collections') {
                    response.data.collections.forEach((coll) => {
                        axios(backend+'/collections/'+coll.name).then(response => {
                            saveToDb(collection, backend, '/collections/'+coll.name, response.data);
                        });
                    });    
                }
            });
        });
    });
    console.log('done');
});
