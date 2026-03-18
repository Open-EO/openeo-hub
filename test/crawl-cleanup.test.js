/**
 * Tests for the crawl cleanup logic that handles well-known document changes.
 *
 * These tests verify that when a backend's well-known document changes
 * (versions added, removed, or URLs updated), the database is properly
 * updated during the post-crawl cleanup phase.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Database = require('../src/db.js');

const TEST_DATA_DIR = path.join(__dirname, '..', 'data-test-' + process.pid);

/**
 * Simulates the post-crawl cleanup logic from crawl.js lines 195–213.
 * This is the key logic that removes stale entries when well-known documents change.
 *
 * @param {Database} db - Database instance
 * @param {string[]} allIndividualBackends - e.g. ["https://example.com@1.0.0"]
 * @param {string[]} allFailedServices - service URLs whose well-known doc failed
 * @param {string[]} configGroups - Object.keys(config.backends)
 */
async function runCleanup(db, allIndividualBackends, allFailedServices, configGroups) {
    // Delete entries whose group was removed from config
    const removedGroupCount = await db.remove({ group: { $nin: configGroups } }, 'raw');

    // Delete entries not referenced in current well-known docs (exempt failed services)
    const allRawDocs = await db.find({}, 'raw');
    const toDelete = allRawDocs.filter(doc =>
        !allIndividualBackends.includes(doc.service + '@' + doc.api_version) &&
        !allFailedServices.includes(doc.service)
    );
    if (toDelete.length > 0) {
        await db.remove({ _id: { $in: toDelete.map(d => d._id) } }, 'raw');
    }

    return { removedGroupCount, removedStaleCount: toDelete.length };
}

/** Helper to insert a raw entry */
function makeRawEntry(overrides = {}) {
    return {
        service: 'https://openeo.example.com',
        api_version: '1.0.0',
        path: '/',
        backend: 'https://openeo.example.com/v1',
        backendTitle: 'Example',
        group: 'Example',
        content: { api_version: '1.0.0', endpoints: [] },
        retrieved: new Date().toJSON(),
        unsuccessfulCrawls: 0,
        ...overrides
    };
}

describe('Crawl cleanup: well-known document changes', () => {
    let db;

    beforeEach(() => {
        db = new Database(TEST_DATA_DIR);
        db.init();
    });

    afterEach(() => {
        // Clean up test database files
        if (fs.existsSync(TEST_DATA_DIR)) {
            fs.readdirSync(TEST_DATA_DIR).forEach(f =>
                fs.unlinkSync(path.join(TEST_DATA_DIR, f))
            );
            fs.rmdirSync(TEST_DATA_DIR);
        }
    });

    it('removes entries when a version is removed from well-known document', async () => {
        // Setup: database has entries for version 0.4.2
        await db.insert(makeRawEntry({
            api_version: '0.4.2',
            backend: 'https://openeo.example.com/v042',
            path: '/'
        }), 'raw');
        await db.insert(makeRawEntry({
            api_version: '0.4.2',
            backend: 'https://openeo.example.com/v042',
            path: '/collections'
        }), 'raw');

        // Simulate: well-known now only lists 1.0.0 (0.4.2 removed)
        const allIndividualBackends = ['https://openeo.example.com@1.0.0'];
        const allFailedServices = [];
        const configGroups = ['Example'];

        await runCleanup(db, allIndividualBackends, allFailedServices, configGroups);

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 0, 'Old 0.4.2 entries should be deleted');
    });

    it('preserves entries for versions still listed in well-known document', async () => {
        // Setup: database has entries for version 1.0.0
        await db.insert(makeRawEntry({ path: '/' }), 'raw');
        await db.insert(makeRawEntry({ path: '/collections' }), 'raw');

        // Simulate: well-known still lists 1.0.0
        const allIndividualBackends = ['https://openeo.example.com@1.0.0'];
        const allFailedServices = [];
        const configGroups = ['Example'];

        await runCleanup(db, allIndividualBackends, allFailedServices, configGroups);

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 2, 'Current version entries should be preserved');
    });

    it('removes old version and preserves new version when well-known changes', async () => {
        // Setup: database has entries for both 0.4.2 and 1.0.0
        await db.insert(makeRawEntry({
            api_version: '0.4.2',
            backend: 'https://openeo.example.com/v042',
            path: '/'
        }), 'raw');
        await db.insert(makeRawEntry({
            api_version: '1.0.0',
            path: '/'
        }), 'raw');

        // Simulate: well-known now only lists 1.0.0
        const allIndividualBackends = ['https://openeo.example.com@1.0.0'];
        const allFailedServices = [];
        const configGroups = ['Example'];

        await runCleanup(db, allIndividualBackends, allFailedServices, configGroups);

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 1, 'Only new version should remain');
        assert.equal(remaining[0].api_version, '1.0.0');
    });

    it('preserves entries when well-known document fetch fails', async () => {
        // Setup: database has entries for version 0.4.2
        await db.insert(makeRawEntry({
            api_version: '0.4.2',
            backend: 'https://openeo.example.com/v042',
            path: '/'
        }), 'raw');

        // Simulate: well-known document failed to download
        const allIndividualBackends = []; // no versions discovered
        const allFailedServices = ['https://openeo.example.com']; // service marked as failed
        const configGroups = ['Example'];

        await runCleanup(db, allIndividualBackends, allFailedServices, configGroups);

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 1, 'Entries should be preserved when service fails');
        assert.equal(remaining[0].api_version, '0.4.2');
    });

    it('removes entries when group is removed from config', async () => {
        await db.insert(makeRawEntry({ path: '/' }), 'raw');

        // Simulate: "Example" group was removed from config
        const allIndividualBackends = [];
        const allFailedServices = [];
        const configGroups = ['OtherBackend']; // "Example" not in config anymore

        const { removedGroupCount } = await runCleanup(db, allIndividualBackends, allFailedServices, configGroups);

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 0, 'Entries for removed group should be deleted');
        assert.equal(removedGroupCount, 1);
    });

    it('handles multiple services with different version changes', async () => {
        // Service A: had 0.4.2, now has 1.0.0
        await db.insert(makeRawEntry({
            service: 'https://service-a.example.com',
            api_version: '0.4.2',
            backend: 'https://service-a.example.com/v042',
            group: 'ServiceA',
            path: '/'
        }), 'raw');

        // Service B: still has 1.0.0
        await db.insert(makeRawEntry({
            service: 'https://service-b.example.com',
            api_version: '1.0.0',
            backend: 'https://service-b.example.com/v1',
            group: 'ServiceB',
            path: '/'
        }), 'raw');

        // Simulate: A changed to 1.0.0, B unchanged
        const allIndividualBackends = [
            'https://service-a.example.com@1.0.0',
            'https://service-b.example.com@1.0.0'
        ];
        const allFailedServices = [];
        const configGroups = ['ServiceA', 'ServiceB'];

        await runCleanup(db, allIndividualBackends, allFailedServices, configGroups);

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 1, 'Only service B entry should remain (A had old version)');
        assert.equal(remaining[0].service, 'https://service-b.example.com');
    });

    it('upsert correctly updates backend URL when it changes for same version', async () => {
        // Simulate the upsert logic from crawl.js line 154-165
        const serviceUrl = 'https://openeo.example.com';
        const api_version = '1.0.0';
        const oldBackendUrl = 'https://openeo.example.com/v1';
        const newBackendUrl = 'https://openeo.example.com/v1-new';

        // Insert old entry
        await db.insert(makeRawEntry({
            backend: oldBackendUrl,
            path: '/'
        }), 'raw');

        // Simulate upsert: remove by service+version+path, then insert with new backend URL
        await db.remove({ service: serviceUrl, api_version: api_version, path: '/' }, 'raw', { multi: false });
        await db.insert(makeRawEntry({
            backend: newBackendUrl,
            path: '/'
        }), 'raw');

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 1);
        assert.equal(remaining[0].backend, newBackendUrl, 'Backend URL should be updated');
    });

    it('preserves entries when well-known document returns empty versions (soft failure)', async () => {
        // Setup: database has entries for version 1.0.0
        await db.insert(makeRawEntry({ path: '/' }), 'raw');
        await db.insert(makeRawEntry({ path: '/collections' }), 'raw');

        // Simulate: well-known doc returned empty versions (treated as soft failure)
        // In crawl.js, this is now handled by pushing to allFailedServices
        const allIndividualBackends = []; // no versions discovered
        const allFailedServices = ['https://openeo.example.com']; // soft failure
        const configGroups = ['Example'];

        await runCleanup(db, allIndividualBackends, allFailedServices, configGroups);

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 2, 'Entries should be preserved on soft failure (empty well-known doc)');
    });

    it('handles service URL change in config (old URL entries removed)', async () => {
        // Old entries stored with old service URL
        await db.insert(makeRawEntry({
            service: 'https://old.example.com',
            backend: 'https://old.example.com/v1',
            path: '/'
        }), 'raw');

        // Config now has new URL; well-known doc at new URL succeeded
        const allIndividualBackends = ['https://new.example.com@1.0.0'];
        const allFailedServices = [];
        const configGroups = ['Example'];

        await runCleanup(db, allIndividualBackends, allFailedServices, configGroups);

        const remaining = await db.find({}, 'raw');
        assert.equal(remaining.length, 0, 'Old service URL entries should be removed');
    });
});
