const config = require('./config.js');

const axios = require('axios');
const INITIAL_TIMEOUT = 5*1000;      // 5 seconds
const RETRY_TIMEOUT = 20*1000;       // 20 seconds

const Database = require('./src/db.js');
const dbqueries = require('./src/dbqueries.js');

const db = new Database(config.dataDir);
db.init();

const starttimestamp = new Date().toJSON();

const verbose = process.argv[2] == '--verbose';

// Helper function to make requests with retry logic
async function fetchWithRetry(url) {
    try {
        return await axios(url, { timeout: INITIAL_TIMEOUT });
    } catch (error) {
        // Don't retry on 404 errors - the resource doesn't exist
        if (error.response && error.response.status === 404) {
            throw error;
        }
        // Retry with longer timeout on other failures
        return await axios(url, { timeout: RETRY_TIMEOUT });
    }
}

async function crawl() {
    console.log('Setting up database indexes...');
    try {
        await db.ensureIndex('raw', { fieldName: 'service' });
        await db.ensureIndex('raw', { fieldName: 'api_version' });
        await db.ensureIndex('raw', { fieldName: 'path' });
        await db.ensureIndex('backends', { fieldName: ['service', 'api_version'], unique: true });
        await db.ensureIndex('collections', { fieldName: 'id' });
        await db.ensureIndex('processes', { fieldName: 'id' });
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
        '/file_formats',
        '/service_types',
        '/udf_runtimes'
    ];

    let allIndividualBackends = [];
    let allFailedServices = [];

    console.log('Crawling all backends... (timeout per request is ' + (axios.defaults.timeout/1000) + ' seconds)');
    console.log('');

    for (var name in config.backends) {
        var serviceUrl = config.backends[name].replace(/\/$/, '');   // always without trailing slash
        var url = serviceUrl + '/.well-known/openeo';

        let individualBackends = {};

        console.log('  - ' + name + ' (well-known document: ' + url + ')');
        
        // enforce HTTPS
        if(! url.startsWith('https')) {
            console.log("REFUSING to crawl insecure service " + serviceUrl + " that does not use HTTPS.\n");
            continue;
        }

        try {
            var response = await fetchWithRetry(url);
            response.data.versions
            .filter(b => ! b.api_version.startsWith('0.'))   // the Hub only supports openEO API v1.0.0 and later
            .forEach(b => individualBackends[b.api_version] = b.url.replace(/\/$/, ''));   // URL always without trailing slash
            if (Object.keys(individualBackends).length > 0) {
                allIndividualBackends = allIndividualBackends.concat(Object.keys(individualBackends).map(version => serviceUrl+'@'+version));
            }
            else {
                // Well-known document was fetched successfully but contained no supported versions.
                // Treat as a soft failure so that existing data is preserved until the
                // unsuccessfulCrawls mechanism cleans it up (avoids accidental data loss
                // when a well-known document temporarily returns an empty version list).
                console.log('    Well-known document for ' + name + ' contained no supported API versions; treating as soft failure.');
                allFailedServices.push(serviceUrl);
            }
        }
        catch(error) {
            console.log('An error occurred while getting or reading ' + url + ' (' + error.name + ': ' + error.message + ')');
            if(verbose) {
                console.log(error);
            }
            allFailedServices.push(serviceUrl);
        }
        console.log('');

        for (var api_version in individualBackends) {
            let backendUrl = individualBackends[api_version];
            var backendTitle = name;

            // enforce HTTPS
            if(! backendUrl.startsWith('https')) {
                console.log("REFUSING to crawl insecure backend " + backendUrl + " that does not use HTTPS.\n");
                continue;
            }

            var paths = [];
            try {
                console.log('      - ' + backendUrl + ' ...');
                const req = await fetchWithRetry(backendUrl+'/');
                const caps = req.data.endpoints
                    .filter(e => e.methods.map(m => m.toLowerCase()).indexOf('get') != -1)  // only keep those that have a GET method
                    .map(e => e.path.replace(/{.*}/g,'{}'));    // replace parameter names with nothing to ease querying

                const hasEndpoint = (path) => caps.indexOf(path) != -1;

                // add all standard endpoints that are supported
                paths.push('/');
                paths = paths.concat(endpoints.filter(hasEndpoint));

                // if `/collections/{id}` is supported: add the individual collections too
                try {
                    if(hasEndpoint('/collections') && hasEndpoint('/collections/{}')) {
                        const collections = (await fetchWithRetry(backendUrl+'/collections')).data.collections;
                        paths = paths.concat(collections.map(c => '/collections/' + c.id));
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

            var bulkNotice = false;
            for(var index in paths) {
                var path = paths[index];
                var isCollectionDetail = path.indexOf('/collections/') != -1;
                if(!isCollectionDetail || verbose) {
                    console.log('          - Downloading ' + backendUrl+path + ' ...');
                }
                if(!bulkNotice && !verbose && isCollectionDetail) {
                    console.log('          - Downloading details for all ' + (paths.length - index) + ' collections... (only outputting errors)')
                    bulkNotice = true;
                }
                try {
                    var response = await fetchWithRetry(backendUrl+path);
                    // extract backend title (if applicable)
                    if(path == '/' && response.data.title) {
                        backendTitle = response.data.title;
                    }
                    // save to database (upsert: delete existing + insert new)
                    var data = response.data;
                    try {
                        await db.remove({ service: serviceUrl, api_version: api_version, path: path }, 'raw', { multi: false });
                        await db.insert({
                            service: serviceUrl,
                            api_version: api_version,
                            path: path,
                            backend: backendUrl,
                            backendTitle: backendTitle,
                            group: name,
                            content: data,
                            retrieved: new Date().toJSON(),
                            unsuccessfulCrawls: 0
                        }, 'raw');
                    }
                    catch(error) {
                        console.log('An error occurred while writing ' + backendUrl+path + ' to the database (' + error.name + ': ' + error.message + ')');
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
            }

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

        // Delete all entries that belong to a group that was meanwhile deleted (or renamed)
        const removedGroupCount = await db.remove({ group: { $nin: Object.keys(config.backends) } }, 'raw');
        if (removedGroupCount > 0) {
            console.log('  Removed ' + removedGroupCount + ' entries from groups no longer in config.');
        }
        
        // Delete all entries that don't belong to one of the backends listed in the currently configured services's well-known documents.
        // But exempt those that failed to download so that temporary outages don't wipe existing data.
        const allRawDocs = await db.find({}, 'raw');
        const toDelete = allRawDocs.filter(doc =>
            !allIndividualBackends.includes(doc.service + '@' + doc.api_version) &&
            !allFailedServices.includes(doc.service)
        );
        if (toDelete.length > 0) {
            // Log which service@version combinations are being removed
            const removedKeys = [...new Set(toDelete.map(d => d.service + '@' + d.api_version))];
            console.log('  Removing entries for backends no longer listed in well-known documents:');
            removedKeys.forEach(k => console.log('    - ' + k));
            await db.remove({ _id: { $in: toDelete.map(d => d._id) } }, 'raw');
        }

        // Increase `unsuccessfulCrawls` counter of items that were not updated in this run
        await db.update({ retrieved: { $lt: starttimestamp } }, { $inc: { unsuccessfulCrawls: 1 } }, 'raw', { multi: true });
        
        // Delete `/collection/{id}` documents that are no longer referenced from their main `/collections` document
        const candidates = await db.find({ unsuccessfulCrawls: { $gte: 1 }, path: { $regex: /^\/collections\/.+$/ } }, 'raw');
        const whitelist = await db.find({ path: '/collections' }, 'raw');
        const accidental = whitelist.filter(b => !(typeof b == 'object' && typeof b.content == 'object' && Array.isArray(b.content.collections))).map(b => b.backend);
        const todelete = candidates.filter(c => {
            if (accidental.indexOf(c.backend) !== -1) return false;  // don't delete if main `/collections` document seems invalid
            const match = whitelist.find(w => w.backend == c.backend);
            if (!match) return false;
            return match.content.collections.some(c2 => c2.id == c.content.id) == false;  // keep candidate for deletion if it's not found in its backend's main `/collections` document
        });
        if (todelete.length > 0) {
            await db.remove({ _id: { $in: todelete.map(e => e._id) } }, 'raw');
        }
        
        // Delete documents that have reached the configured threshold of maximum unsuccessful crawls
        await db.remove({ unsuccessfulCrawls: { $gte: config.unsuccessfulCrawls.deleteAfter } }, 'raw');

        // Aggregate data from raw collection into backends, collections, and processes collections
        const rawDocs = await db.find({}, 'raw');

        // Update backends collection, preserving metadata
        const backends = dbqueries.getAllBackends(rawDocs);
        const existingBackends = await db.find({}, 'backends');
        const backendMap = {};
        for (const existing of existingBackends) {
            backendMap[existing.service + '@' + existing.api_version] = existing;
        }
        for (const backend of backends) {
            const key = backend.service + '@' + backend.api_version;
            const existing = backendMap[key];
            if (existing) {
                // Preserve metadata from existing entry
                backend.retrieved = existing.retrieved;
                backend.unsuccessfulCrawls = existing.unsuccessfulCrawls;
                await db.update({ service: backend.service, api_version: backend.api_version }, backend, 'backends');
            } else {
                await db.insert(backend, 'backends');
            }
        }
        
        // Remove backends that are no longer in the raw data
        const backendKeysInRaw = new Set(backends.map(b => b.service + '@' + b.api_version));
        await db.remove({ _id: { $in: existingBackends.filter(b => !backendKeysInRaw.has(b.service + '@' + b.api_version)).map(b => b._id) } }, 'backends');

        // Replace collections collection
        await db.remove({}, 'collections');
        const collections = dbqueries.getAllCollections(rawDocs);
        for (const col of collections) {
            await db.insert(col, 'collections');
        }

        // Replace processes collection
        await db.remove({}, 'processes');
        const processes = dbqueries.getAllProcesses(rawDocs);
        for (const proc of processes) {
            await db.insert(proc, 'processes');
        }
        
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
        console.log('');
        console.log('DONE!');
    }
}

crawl();
