const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const axios = require('axios');
const { OpenEO } = require('@openeo/js-client');

const mongo = new MongoClient(config.dbUrl, { useNewUrlParser: true } );

const dbqueries = require('./src/dbqueries.js');

const starttimestamp = new Date().toJSON();

const verbose = process.argv[2] == '--verbose';

console.log('Connecting to database server...');
mongo.connect(async (err, client) => {
    if(err != null) {
        console.log();
        console.log('An error occurred while connecting to the database server: ' + err.name);
        console.log('Error message: ' + err.message);
        if(verbose) {
            console.log('Stack:');
            console.log(err.stack);
        }
        console.log();
        console.log('CRAWLING ABORTED!')
        return 1;  // abort with non-zero exit code
    }

    const db = client.db(config.dbName);
    const collection = db.collection('raw');
    console.log('Connected to database server.');
    console.log('');

    console.log('Setting up database indexes...');
    db.collection('raw').createIndex({backend: 1, path: 1}, { name: 'backend-path_unique', unique: true });
    db.collection('backends').createIndex({backend: 1}, { name: 'backend_unique', unique: true });
    db.collection('collections').createIndex({name: "text", title: "text", description: "text"}, { name: 'name-title-description_text' });
    db.collection('processes').createIndex({name: "text", summary: "text", description: "text", "returns.description": "text", "parametersAsArray.k": "text", "parametersAsArray.v.description": "text"}, {name: 'name-summary-description-paramname-paramdescription_text'});
    console.log('Set up database indexes.');
    console.log('');

    const endpoints = {
        listCollections: '/collections',
        listProcesses: '/processes',
        listFileTypes: '/output_formats',
        listServiceTypes: '/service_types'
    };

    let individualBackends = {};

    console.log('Gathering API URLs...');
    for (var url in config.backends) {
        console.log('  - ' + url);
        if(url.substr(-19) == '/.well-known/openeo') {
            await axios(url)
            .then(response => {
                response.data.versions.forEach(b => individualBackends[b.url] = config.backends[url] + ' v' + b.api_version);
            })
            .catch(error => {
                console.log('An error occurred while getting or reading /.well-known/openeo document of ' + backendUrl+path);
                if(verbose) {
                    console.log(error);
                }
            });
        } else {
            individualBackends[url] = config.backends[url];
        }
    }
    console.log('');
    
    console.log('Gathering endpoint URLs...');
    for (var backendUrl in individualBackends) {
        let backendTitle = individualBackends[backendUrl];
        try {
            console.log('  - ' + backendUrl + ' ...');
            var paths = [];
            const con = await OpenEO.connectDirect(backendUrl);
            const caps = await con.capabilities();

            // add all standard endpoints that are supported
            paths.push('/');
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
            console.log('An error occurred while gathering endpoint URLs for ' + backendUrl);
            if(verbose) {
                console.log(error);
            }
        }

        for(var index in paths) {
            var path = paths[index];
            if(path.indexOf('/collections/') == -1 || verbose) {
                console.log('      - Downloading ' + backendUrl+path + ' ...');
            }
            await axios(backendUrl+path)
            .then(response => {
                // extract backend title (if applicable)
                if(path == '/') {
                    backendTitle = response.data.title;
                }
                // save to database
                var data = response.data;
                collection.findOneAndUpdate(
                    { backend: backendUrl, backendTitle: backendTitle, path: path },
                    { $set: { retrieved: new Date().toJSON(), unsuccessfulCrawls: 0, content: data } },
                    { upsert: true }
                );
            })
            .catch(error => {
                console.log('An error occurred while downloading ' + backendUrl+path);
                if(verbose) {
                    console.log(error);
                }
            });
        };

        console.log('');
    }

    // once all requests have finished
    try {
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
    }
    catch(error) {
        console.log('An error occurred while finalising the crawl process.');
        if(verbose) {
            console.log(error);
        }
    }
});
