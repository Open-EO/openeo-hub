const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const axios = require('axios');
const OpenEO = require('@openeo/js-client').OpenEO;

const mongo = new MongoClient(config.dbUrl, { useNewUrlParser: true } );
const openeo = new OpenEO();

const dbqueries = require('./src/dbqueries.js');

const starttimestamp = new Date().toJSON();

const verbose = process.argv[2] == '--verbose';

console.log('Connecting to database server...');
mongo.connect(async (err, client) => {
    assert.equal(null, err);
    const db = client.db(config.dbName);
    const collection = db.collection('raw');
    console.log('Connected to database server.');
    console.log('Setting up database indexes...');
    db.collection('raw').createIndex({backend: 1, path: 1}, { name: 'backend-path_unique', unique: true });
    db.collection('backends').createIndex({backend: 1}, { name: 'backend_unique', unique: true });
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

        try {
            console.log('Gathering endpoint URLs for ' + backend + ' ...');
            var paths = [];
            const con = await openeo.connect(backend);
            const caps = await con.capabilities();

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
        }  
        catch(error) {
            console.log('An error occured while gathering endpoint URLs for ' + backend + ' :');
            if(verbose) {
                console.log(error);
            }
        }

        if(paths.length > 0) {
            console.log('Starting crawling of ' + backend + ' ...');
        }

        // Request them all
        paths.forEach((path, index) => {
            if(verbose) {
                console.log('  Scheduling download for ' + backend+path);
            }
            promises.push(
                new Promise(resolve => {
                    const downloader = () => {
                        if(verbose) {
                            console.log('  Now downloading ' + backend+path);
                        }
                        resolve(
                            axios(backend+path)
                            .then(response => {
                                // save to database
                                collection.findOneAndUpdate(
                                    { backend: backend, path: path},
                                    { $set: { retrieved: new Date().toJSON(), unsuccessfulCrawls: 0, content: response.data } },
                                    { upsert: true }
                                );
                            })
                            .catch(error => {
                                console.log('An error occured while downloading ' + backend+path);
                                if(verbose) {
                                    console.log(error);
                                }
                            })
                        );
                    };
                    setTimeout(downloader, index * config.crawlDelay);
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
        collection.updateMany({retrieved: {$lt: starttimestamp}}, {$inc: {unsuccessfulCrawls: 1}});
        collection.deleteMany({unsuccessfulCrawls: {$gte: config.unsuccessfulCrawls.deleteAfter}});
        // Get all collections as usual, but in the end remove `id` from result to avoid "duplicate key" errors and output.
        // Call `hasNext` because as long as there's no I/O request the Mongo Node driver doesn't actually execute the pipeline.
        collection.aggregate(dbqueries.GET_ALL_BACKENDS_PIPELINE   .concat([{$project: {_id: 0}}, {$out: 'backends'}]))   .hasNext();
        collection.aggregate(dbqueries.GET_ALL_COLLECTIONS_PIPELINE.concat([{$project: {_id: 0}}, {$out: 'collections'}])).hasNext();
        collection.aggregate(dbqueries.GET_ALL_PROCESSES_PIPELINE  .concat([{$project: {_id: 0}}, {$out: 'processes'}]))  .hasNext();
        console.log('Finished processing data.');
        console.log('');

        console.log('Closing database connection...');
        mongo.close();
        console.log('Closed database connection.')
        console.log('');
        console.log('DONE!');
    })
    .catch(error => {
        console.log('An error occured while finalising the crawl process.');
        if(verbose) {
            console.log(error);
        }
    });
});
