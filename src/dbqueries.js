// These functions replace the MongoDB aggregation pipelines.
// Each function takes an array of documents and returns the aggregated result.

module.exports = {

    // Aggregates raw documents into backend summaries.
    // Input: array of documents from the 'raw' collection.
    getAllBackends(rawDocs) {
        const mainPaths = ['/', '/collections', '/processes', '/service_types', '/output_formats', '/file_formats', '/udf_runtimes'];

        // Filter to main endpoint paths and sort
        let docs = rawDocs.filter(d => mainPaths.includes(d.path));
        docs.sort((a, b) => (a.backend + a.path).localeCompare(b.backend + b.path));

        // Group by service@api_version
        const groups = {};
        for (const doc of docs) {
            const key = doc.service + '@' + doc.api_version;
            if (!groups[key]) {
                groups[key] = {
                    service: doc.service,
                    api_version: doc.api_version,
                    backend: doc.backend,
                    backendTitle: doc.backendTitle,
                    group: doc.group,
                    retrieved: doc.retrieved,
                    unsuccessfulCrawls: doc.unsuccessfulCrawls,
                    contents: [],
                    paths: []
                };
            }
            const g = groups[key];
            if (doc.retrieved < g.retrieved) g.retrieved = doc.retrieved;  // min
            g.unsuccessfulCrawls = Math.max(g.unsuccessfulCrawls, doc.unsuccessfulCrawls);  // max
            g.contents.push(doc.content);
            g.paths.push(doc.path);
        }

        // Transform each group into the final backend document
        return Object.values(groups).map(g => {
            const getContent = (path) => {
                const idx = g.paths.indexOf(path);
                return idx === -1 ? null : g.contents[idx];
            };

            const root = getContent('/');
            const collections = getContent('/collections');
            const processes = getContent('/processes');
            const fileFormats = getContent('/output_formats') || getContent('/file_formats');
            const serviceTypes = getContent('/service_types');
            const udfRuntimes = getContent('/udf_runtimes');

            return {
                service: g.service,
                api_version: root ? root.api_version : g.api_version,
                backend: g.backend,
                backendTitle: g.backendTitle,
                group: g.group,
                retrieved: g.retrieved,
                unsuccessfulCrawls: g.unsuccessfulCrawls,
                production: root ? (root.production || false) : false,
                description: root ? root.description : undefined,
                links: root ? (root.links || []) : [],
                endpoints: root && root.endpoints
                    ? root.endpoints.reduce((acc, ep) => acc.concat(ep.methods.map(m => m + ' ' + ep.path)), [])
                    : [],
                collections: collections ? collections.collections : null,
                processes: processes ? processes.processes : null,
                fileFormats: (() => {
                    const input = fileFormats ? (fileFormats.input || {}) : {};
                    const output = fileFormats ? (fileFormats.output || fileFormats) : {};
                    return (Object.keys(input).length > 0 || Object.keys(output).length > 0)
                        ? { input, output }
                        : null;
                })(),
                serviceTypes: serviceTypes,
                udfRuntimes: udfRuntimes,
                billing: root ? root.billing : undefined
            };
        });
    },

    // Extracts and deduplicates collections from raw data.
    // Input: array of documents from the 'raw' collection.
    getAllCollections(rawDocs) {
        const docs = rawDocs.filter(d =>
            d.path === '/collections' && d.content && Array.isArray(d.content.collections)
        );

        const seen = {};
        const results = [];
        for (const doc of docs) {
            for (const col of doc.content.collections) {
                // unique key matching the original pipeline's $group _id
                const key = (col.id || '') + '@' + doc.service + '@' + doc.api_version;
                if (!seen[key]) {
                    seen[key] = true;
                    results.push({
                        ...col,
                        service: doc.service,
                        api_version: doc.api_version,
                        backend: doc.backend,
                        backendTitle: doc.backendTitle,
                        retrieved: doc.retrieved,
                        unsuccessfulCrawls: doc.unsuccessfulCrawls
                    });
                }
            }
        }
        return results;
    },

    // Extracts and deduplicates processes from raw data.
    // Input: array of documents from the 'raw' collection.
    getAllProcesses(rawDocs) {
        const docs = rawDocs.filter(d =>
            d.path === '/processes' && d.content && Array.isArray(d.content.processes)
        );

        const seen = {};
        const results = [];
        for (const doc of docs) {
            for (const proc of doc.content.processes) {
                const key = (proc.id || '') + '@' + doc.service + '@' + doc.api_version;
                if (!seen[key]) {
                    seen[key] = true;
                    results.push({
                        ...proc,
                        service: doc.service,
                        api_version: doc.api_version,
                        backend: doc.backend,
                        backendTitle: doc.backendTitle,
                        retrieved: doc.retrieved,
                        unsuccessfulCrawls: doc.unsuccessfulCrawls
                    });
                }
            }
        }
        return results;
    },

    // Returns distinct collections (by ID), sorted by id ASC.
    // Input: array of documents from the 'collections' collection.
    getDistinctCollections(collections) {
        const groups = {};
        for (const col of collections) {
            const key = (col.id || '').toLowerCase();
            if (!groups[key]) {
                groups[key] = { id: col.id, title: col.title };
            }
        }
        return Object.values(groups).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    },

    // Returns distinct processes with occurrence count, sorted by count DESC then id ASC.
    // Input: array of documents from the 'processes' collection.
    getDistinctProcessesWithCount(processes) {
        const groups = {};
        for (const proc of processes) {
            const key = (proc.id || '').toLowerCase();
            if (!groups[key]) {
                groups[key] = { id: proc.id, summary: proc.summary, allSummaries: new Set(), count: 0 };
            }
            groups[key].allSummaries.add(proc.summary);
            groups[key].count++;
        }
        return Object.values(groups)
            .map(g => ({ id: g.id, summary: g.summary, allSummaries: [...g.allSummaries], count: g.count }))
            .sort((a, b) => b.count - a.count || (a.id || '').localeCompare(b.id || ''));
    },

    // Returns input file formats with count, sorted by count DESC then format ASC.
    // Input: array of documents from the 'backends' collection.
    getInputFormatsWithCount(backends) {
        const groups = {};
        for (const b of backends) {
            if (b.fileFormats && b.fileFormats.input) {
                for (const format of Object.keys(b.fileFormats.input)) {
                    const key = format.toLowerCase();
                    if (!groups[key]) groups[key] = { format, count: 0 };
                    groups[key].count++;
                }
            }
        }
        return Object.values(groups).sort((a, b) => b.count - a.count || a.format.localeCompare(b.format));
    },

    // Returns output file formats with count, sorted by count DESC then format ASC.
    // Input: array of documents from the 'backends' collection.
    getOutputFormatsWithCount(backends) {
        const groups = {};
        for (const b of backends) {
            if (b.fileFormats && b.fileFormats.output) {
                for (const format of Object.keys(b.fileFormats.output)) {
                    const key = format.toLowerCase();
                    if (!groups[key]) groups[key] = { format, count: 0 };
                    groups[key].count++;
                }
            }
        }
        return Object.values(groups).sort((a, b) => b.count - a.count || a.format.localeCompare(b.format));
    },

    // Returns service types with count, sorted by count DESC then service ASC.
    // Input: array of documents from the 'backends' collection.
    getServiceTypesWithCount(backends) {
        const groups = {};
        for (const b of backends) {
            if (b.serviceTypes) {
                for (const service of Object.keys(b.serviceTypes)) {
                    const key = service.toLowerCase();
                    if (!groups[key]) groups[key] = { service, count: 0 };
                    groups[key].count++;
                }
            }
        }
        return Object.values(groups).sort((a, b) => b.count - a.count || a.service.localeCompare(b.service));
    },

    // Returns UDF runtimes with count, sorted by count DESC then runtime ASC.
    // Input: array of documents from the 'backends' collection.
    getUdfRuntimesWithCount(backends) {
        const groups = {};
        for (const b of backends) {
            if (b.udfRuntimes) {
                for (const runtime of Object.keys(b.udfRuntimes)) {
                    const key = runtime.toLowerCase();
                    if (!groups[key]) groups[key] = { runtime, count: 0 };
                    groups[key].count++;
                }
            }
        }
        return Object.values(groups).sort((a, b) => b.count - a.count || a.runtime.localeCompare(b.runtime));
    }
};
