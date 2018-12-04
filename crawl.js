const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const axios = require('axios');
const OpenEO = require('@openeo/js-client').OpenEO;

const mongo = new MongoClient(config.dbUrl, { useNewUrlParser: true } );
const openeo = new OpenEO();

const consts = require('./src/dbqueries.js');

console.log('Connecting to database server...');
mongo.connect(async (err, client) => {
    assert.equal(null, err);
    const db = client.db(config.dbName);
    const collection = db.collection('backends');
    console.log('Connected to database server.');
    console.log('Setting up database indexes...');
    db.collection('collections').createIndex({name: "text", title: "text", description: "text"}, { name: 'name-title-description_text' });
    db.collection('processes').createIndex({name: "text", summary: "text", description: "text", "returns.description": "text", "parametersAsArray.k": "text", "parametersAsArray.v.description": "text"}, {name: 'name-summary-description-paramname-paramdescription_text'});
    console.log('Set up database indexes.');
    console.log('');

    const endpoints = {
        capabilities: '/',
        listCollections: '/collections',
        listProcesses: '/processes',
        listFileTypes: '/output_formats',
        listServiceTypes: '/service_types'
    };

    var promises = [];

    // use a for-loop instead of forEach because forEach wouldn't `await` the result of the callback and thus mess up the order
    for(var i in config.backends) {
        // set shorthand
        const backend = config.backends[i];

        console.log('Gathering endpoint URLs for ' + backend + ' ...');

        const con = await openeo.connect(backend);
        const caps = await con.capabilities();
        var paths = [];

        // add all standard endpoints that are supported
        for (var method in endpoints) {
            if(caps.hasFeature(method)) {
                paths.push(endpoints[method]);
            }
        }

        // if `/collections/{name}` is supported: add the individual collections too
        if(caps.hasFeature('listCollections') && caps.hasFeature('describeCollection')) {
            const collections = await con.listCollections();
            paths = paths.concat(collections.collections.map(c => '/collections/' + (c.name || c.id)));
        }

        console.log('Starting crawling of ' + backend + ' ...');

        // Request them all
        paths.forEach(path => {
            promises.push(
                axios(backend+path)
                .then(response => {
                    // save to database
                    collection.insertOne({
                        backend: backend,
                        path: path,
                        retrieved: new Date().toJSON(),
                        content: response.data
                    });
                })
                .catch(error => {
                    console.log(error);
                })
            );
        });
    }

    // once all requests have finished
    Promise.all(promises)
    .then(() => {
        console.log('');
        console.log('Finished crawling of all backends.');
        console.log('');

        console.log('Processing data...');
        // Get all collections as usual, but in the end remove `id` from result to avoid "duplicate key" errors and output.
        // Call `hasNext` because as long as there's no I/O request the Mongo Node driver doesn't actually execute the pipeline.
        collection.aggregate(consts.GET_ALL_COLLECTIONS_PIPELINE.concat([{$project: {_id: 0}}, {$out: 'collections'}])).hasNext();
        collection.aggregate(consts.GET_ALL_PROCESSES_PIPELINE.concat([{$project: {_id: 0}}, {$out: 'processes'}])).hasNext();
        console.log('Finished processing data.');
        console.log('');

        console.log('Closing database connection...');
        mongo.close();
        console.log('Closed database connection.')
        console.log('');
        console.log('DONE!');
    })
    .catch(error => console.log(error));
});
