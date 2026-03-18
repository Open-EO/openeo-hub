const path = require('path');
const PACKAGEJSON = require('./package.json');
const config = require('./config.js');

const dbqueries = require('./src/dbqueries.js');

const Database = require('./src/db.js');
const db = new Database(config.dataDir);
db.init();

const express = require('express');
const app = express();

const {ProcessRegistry, ProcessGraph} = require('@openeo/js-processgraphs');

// -------------------------------------------------------------------------------------
// Helper function for preparing the result before sending
// -------------------------------------------------------------------------------------

function prepare(data, additionalCallbacks = []) {
    function removeDBID(item) {
        if (item) delete item._id;
        return item;
    }

    function addBackendTitle(item) {
        if(item && typeof item.backend == 'string') {
            item.backendUrl = item.backend;
            item.backendTitle = item.backendTitle;
            delete item.backend;
        }
        return item;
    }

    let callbacks = [removeDBID, addBackendTitle].concat(additionalCallbacks);

    if(Array.isArray(data)) {
        callbacks.forEach(cb => data = data.map(cb));
        return data;
    } else {
        callbacks.forEach(cb => data = cb.call(this, data));
        return data;
    }
}


// -------------------------------------------------------------------------------------
// Helper function for dealing with CORS preflight stuff
// -------------------------------------------------------------------------------------

function enableCORS(req, res) {
    res.set('Vary', 'Origin');
    if(req.headers.origin) {
        res.set('Access-Control-Allow-Origin', req.headers.origin);
    }
}


// -------------------------------------------------------------------------------------
// Middleware
// -------------------------------------------------------------------------------------

// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Prevent crashing when URL contains nullbytes
app.use((req, res, next) => {
    req.url = req.url.replace(/%00|\u0000/g, '');
    next();
});


// -------------------------------------------------------------------------------------
// Actual handlers for the individual endpoints
// -------------------------------------------------------------------------------------

// list backends
app.get('/api/backends', async (req, res) => {
    enableCORS(req, res);
    if(!req.query.details) {
        res.json(config.backends);
    } else {
        const clip = b => {
            if(b.collections) { b.collections = b.collections.map(e => ({id: e.id})); }
            if(b.processes) { b.processes = b.processes.map(e => ({id: e.id})); }
            return b;
        };

        if(req.query.details == 'grouped') {
            const backends = await db.find({}, 'backends');
            const groups = {};
            for (const b of backends) {
                if (!groups[b.group]) {
                    groups[b.group] = { _id: b.group, name: b.group, url: b.backend, backends: [] };
                }
                groups[b.group].backends.push(prepare(b, [clip]));
            }
            res.json(Object.values(groups));
        } else {
            const data = await db.find({}, 'backends');
            res.json(prepare(data, (req.query.details == 'clipped' ? [clip] : [])));
        }
    }
});

// return details of a single backend
app.get('/api/backends/:backend', async (req, res) => {
    const data = await db.findOne({backend: decodeURIComponent(req.params.backend)}, 'backends');
    res.json(prepare(data));
});

// return collection details of a single backend
app.get('/api/backends/:backend/collections', async (req, res) => {
    const data = await db.find({backend: decodeURIComponent(req.params.backend)}, 'collections');
    res.json(prepare(data));
});

// return collection details of a specific collection of a single backend
app.get('/api/backends/:backend/collections/:identifier', async (req, res) => {
    const data = await db.findOne({
        backend: decodeURIComponent(req.params.backend),
        path: '/collections/' + decodeURIComponent(req.params.identifier)
    }, 'raw');
    if (data) {
        res.json(prepare(data).content);
    } else {
        res.status(404).json({ message: "Not Found" });
    }
});

// return process details of a single backend
app.get('/api/backends/:backend/processes', async (req, res) => {
    const data = await db.find({backend: decodeURIComponent(req.params.backend)}, 'processes');
    res.json(prepare(data));
});

// proxy backends
app.get('/api/backends/:backend/{*rest}', async (req, res) => {
    const restPath = '/' + req.params.rest.join('/');
    const data = await db.findOne({backend: req.params.backend, path: restPath}, 'raw');
    res.json(data);
});

// list collections
app.get('/api/collections', async (req, res) => {
    const data = await db.find({}, 'collections');
    res.json(prepare(dbqueries.getDistinctCollections(data)));
});

// list processes
app.get('/api/processes', async (req, res) => {
    const data = await db.find({}, 'processes');
    res.json(prepare(dbqueries.getDistinctProcessesWithCount(data)));
});

// list input formats
app.get('/api/input_formats', async (req, res) => {
    const data = await db.find({}, 'backends');
    res.json(prepare(dbqueries.getInputFormatsWithCount(data)));
});

// list output formats
app.get('/api/output_formats', async (req, res) => {
    const data = await db.find({}, 'backends');
    res.json(prepare(dbqueries.getOutputFormatsWithCount(data)));
});

// list service types
app.get('/api/service_types', async (req, res) => {
    const data = await db.find({}, 'backends');
    res.json(prepare(dbqueries.getServiceTypesWithCount(data)));
});

// list UDF runtimes
app.get('/api/udf_runtimes', async (req, res) => {
    const data = await db.find({}, 'backends');
    res.json(prepare(dbqueries.getUdfRuntimesWithCount(data)));
});

// validates the given `process_graph` for every URL from the `links` array
// compliant to openEO API v1.0.1 (as long as only 1 URL is submitted)
app.post('/api/validation', async (req, res) => {
    const links = req.body.links.map(b => b.href);
    const data = await db.find({}, 'backends');
    const matchedBackends = data.filter(b => links.includes(b.backend));

    let checks = matchedBackends.map(b => {
        const pr = new ProcessRegistry(b.processes);
        const pg = new ProcessGraph(req.body.process_graph, pr);
        return pg.validate(false).catch(() => []);
    });

    const results = await Promise.all(checks);
    if(results.length == 1) {
        res.json({errors: results[0]});
    } else {
        res.json(results.map(errlist => ({errors: errlist})));
    }
});

app.get('/api', function(req, res) {
    res.json({
        api_version: '0.4.2',
        backend_version: PACKAGEJSON.version,
        title: 'openEO Hub',
        description: PACKAGEJSON.description,
        endpoints: [
            { path: '/backends', methods: ['GET'] }
        ]
    });
});

// serve website (UI)
app.use(express.static(path.join(__dirname, 'dist')));
app.get('{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// -------------------------------------------------------------------------------------
// Start server
// -------------------------------------------------------------------------------------

console.log('Starting the server...');
app.listen(9000, function() {
    console.log('Server started at http://localhost:9000.');
});
