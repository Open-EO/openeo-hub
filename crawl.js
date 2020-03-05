const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;

const axios = require('axios');
axios.defaults.timeout = 10*1000;   // 10s = 10000 ms

const mongo = new MongoClient(config.dbUrl, { useNewUrlParser: true, useUnifiedTopology: true } );

const dbqueries = require('./src/dbqueries.js');

const starttimestamp = new Date().toJSON();

const verbose = process.argv[2] == '--verbose';

console.log('Connecting to database server...');
mongo.connect(async (error, client) => {
    if(error != null) {
        console.log();
        console.log('An error occurred while connecting to the database server (' + error.name + ': ' + error.message + ')');
        if(verbose) {
            console.log(error);
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
    try {
        await db.collection('raw').createIndex({backend: 1, path: 1}, { name: 'backend-path_unique', unique: true });
        await db.collection('backends').createIndex({backend: 1}, { name: 'backend_unique', unique: true });
        await db.collection('collections').createIndex({name: "text", title: "text", description: "text"}, { name: 'name-title-description_text' });
        await db.collection('processes').createIndex({name: "text", summary: "text", description: "text", "returns.description": "text"}, {name: 'name-summary-description_text'});
        console.log('Set up database indexes.');
    }
    catch(error) {
        console.log('An error occurred while setting up database indexes (' + error.name + ': ' + error.message + ')');
        if(verbose) {
            console.log(error);
        }
    }
    console.log('');

    const endpoints = [
        '/collections',
        '/processes',
        '/output_formats',
        '/service_types'
    ];

    console.log('Crawling all backends...');
    for (var name in config.backends) {
        var url = config.backends[name];
        url = url + (url.endsWith('/') ? '' : '/') + '.well-known/openeo';

        let individualBackends = {};

        console.log('  - ' + name + ' (well-known document: ' + url + ')');
        try {
            var response = await axios(url);
            response.data.versions.forEach(b => individualBackends[name + ' v' + b.api_version] = b.url.replace(/\/$/, ''));
        }
        catch(error) {
            console.log('An error occurred while getting or reading ' + url + ' (' + error.name + ': ' + error.message + ')');
            if(verbose) {
                console.log(error);
            }
        }
        console.log('');

        for (var backendTitle in individualBackends) {
            let backendUrl = individualBackends[backendTitle];
            try {
                console.log('      - ' + backendUrl + ' ...');
                var paths = [];
                const req = await axios(backendUrl+'/');
                const caps = req.data.endpoints
                    .filter(e => e.methods.map(m => m.toLowerCase()).indexOf('get') != -1)  // only keep those that have a GET method
                    .map(e => e.path.replace(/{.*}/g,'{}'));    // replace parameter names with nothing to ease querying

                const hasEndpoint = (path) => caps.indexOf(path) != -1;

                // add all standard endpoints that are supported
                paths.push('/');
                paths = paths.concat(endpoints.filter(hasEndpoint));

                // if `/collections/{name}` is supported: add the individual collections too
                try {
                    if(hasEndpoint('/collections') && hasEndpoint('/collections/{}')) {
                        const collections = (await axios(backendUrl+'/collections')).data.collections;
                        paths = paths.concat(collections.map(c => '/collections/' + (c.name || c.id)));
                    }
                }
                catch(error) {
                    console.log('An error occurred while gathering collection detail URLs for ' + backendUrl + ' (' + error.name + ': ' + error.message + ')');
                    if(verbose) {
                        console.log(error);
                    }
                }
            }  
            catch(error) {
                console.log('An error occurred while gathering endpoint URLs for ' + backendUrl + ' (' + error.name + ': ' + error.message + ')');
                if(verbose) {
                    console.log(error);
                }
            }

            for(var index in paths) {
                var path = paths[index];
                if(path.indexOf('/collections/') == -1 || verbose) {
                    console.log('          - Downloading ' + backendUrl+path + ' ...');
                }
                try {
                    var response = await axios(backendUrl+path);
                    // extract backend title (if applicable)
                    if(path == '/' && response.data.title) {
                        backendTitle = response.data.title;
                    }
                    // save to database
                    var data = response.data;
                    try {
                        await collection.findOneAndUpdate(
                            { backend: backendUrl, path: path },
                            { $set: {
                                backendTitle: backendTitle,
                                group: name,
                                content: data,
                                retrieved: new Date().toJSON(),
                                unsuccessfulCrawls: 0
                            }},
                            { upsert: true }
                        )
                    }
                    catch(error) {
                        console.log('An error occurred while writing to the database (' + error.name + ': ' + error.message + ')');
                        if(verbose) {
                            console.log(error);
                        }
                    }
                }
                catch(error) {
                    console.log('An error occurred while downloading ' + backendUrl+path + ' (' + error.name + ': ' + error.message + ')');
                    if(verbose) {
                        console.log(error);
                    }
                }
            };

            console.log('');
        }
        console.log('');
    }

    // once all requests have finished
    try {
        console.log('');
        console.log('Finished crawling of all backends.');
        console.log('');

        console.log('Processing data...');

        // Increase `unsucessfulCrawls` counter of items that were not updated in this run
        await collection.updateMany({retrieved: {$lt: starttimestamp}}, {$inc: {unsuccessfulCrawls: 1}});
        
        // Delete `/collection/{id}` documents that are no longer referenced from their main `/collections` document
        candidates = await collection.find({unsuccessfulCrawls: {$gte: 1}, path: {$regex: /^\/collections\/.+$/}}).toArray();  // `unsuccessfulCrawls` of legit candidates *should* always be ==1 (not ==0 because then they would still be in the main collection document, not >1 because then they would already have been removed during the previous crawl, but use >=1 anyway)
        whitelist = await collection.find({path: "/collections"}).toArray();   // get "ground truth" for *all* backends
        todelete = candidates.filter(c =>
            whitelist.find(w => w.backend == c.backend)   // use the correct backend for the check
            .content.collections.some(c2 => (c2.name||c2.id) == (c.content.name||c.content.id)) == false  // keep candidate for deletion if it's not found in its backend's main `/collections` document
        );
        await collection.deleteMany({_id: {$in: todelete.map(e => e._id)}});   // actually delete remaining candidates
        // Similar (not identical!) query (relies solely on `unsuccessfulCrawls` and DOES NOT check the actual ground truth)
        // collection.deleteMany({unsuccessfulCrawls: {$gte: 1}, path: {$regex: /^\/collections\/.+$/}});
        
        // Delete documents that have reached the configured threshold of maximum unsuccessful crawls
        await collection.deleteMany({unsuccessfulCrawls: {$gte: config.unsuccessfulCrawls.deleteAfter}});

        // Get all collections as usual, but in the end remove `id` from result to avoid "duplicate key" errors and output.
        // Call `hasNext` because as long as there's no I/O request the Mongo Node driver doesn't actually execute the pipeline.
        await collection.aggregate(dbqueries.GET_ALL_BACKENDS_PIPELINE   .concat([{$project: {_id: 0}}, {$out: 'backends'}]))   .hasNext();
        await collection.aggregate(dbqueries.GET_ALL_COLLECTIONS_PIPELINE.concat([{$project: {_id: 0}}, {$out: 'collections'}])).hasNext();
        await collection.aggregate(dbqueries.GET_ALL_PROCESSES_PIPELINE  .concat([{$project: {_id: 0}}, {$out: 'processes'}]))  .hasNext();
        
        console.log('Finished processing data.');
        console.log('');
    }
    catch(error) {
        console.log('An error occurred while finalising the crawl process (' + error.name + ': ' + error.message + ')');
        if(verbose) {
            console.log(error);
        }
        console.log('');
    }
    finally {
        console.log('Closing database connection...');
        try {
            await mongo.close();
            console.log('Closed database connection.')
        }
        catch(error) {
            console.log('An error occurred while closing the database connection (' + error.name + ': ' + error.message + ')');
            if(verbose) {
                console.log(error);
            }
        }
        console.log('');
        console.log('DONE!');
    }
});
