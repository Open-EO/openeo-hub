const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

// NeDB forbids field names starting with '$'. openEO API responses can
// contain JSON-Schema keys like $schema, $ref, etc.  We transparently
// replace a leading '$' with the fullwidth dollar sign (U+FF04 ＄) on
// write and restore it on read so callers always see the original data.
const DOLLAR = '$';
const DOLLAR_REPLACEMENT = '\uff04';  // ＄

function encodeDoc(obj) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof RegExp) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(encodeDoc);
    }
    const out = {};
    for (const key of Object.keys(obj)) {
        const newKey = key.startsWith(DOLLAR) ? DOLLAR_REPLACEMENT + key.slice(1) : key;
        out[newKey] = encodeDoc(obj[key]);
    }
    return out;
}

function decodeDoc(obj) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof RegExp) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(decodeDoc);
    }
    const out = {};
    for (const key of Object.keys(obj)) {
        const newKey = key.startsWith(DOLLAR_REPLACEMENT) ? DOLLAR + key.slice(1) : key;
        out[newKey] = decodeDoc(obj[key]);
    }
    return out;
}

class Database {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.datastores = {};
    }

    init() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    getCollection(name) {
        if (!this.datastores[name]) {
            this.datastores[name] = new Datastore({
                filename: path.join(this.dataDir, name + '.db'),
                autoload: true
            });
        }
        return this.datastores[name];
    }

    async ensureIndex(collectionName, options) {
        return this.getCollection(collectionName).ensureIndexAsync(options);
    }

    async insert(doc, collectionName) {
        const result = await this.getCollection(collectionName).insertAsync(encodeDoc(doc));
        return decodeDoc(result);
    }

    async findOne(query, collectionName) {
        const result = await this.getCollection(collectionName).findOneAsync(query);
        return decodeDoc(result);
    }

    async find(query, collectionName) {
        const results = await this.getCollection(collectionName).findAsync(query);
        return results.map(decodeDoc);
    }

    async update(query, update, collectionName, options = {}) {
        return this.getCollection(collectionName).updateAsync(query, update, options);
    }

    async remove(query, collectionName, options = { multi: true }) {
        return this.getCollection(collectionName).removeAsync(query, options);
    }

    async dropCollection(name) {
        const filePath = path.join(this.dataDir, name + '.db');
        // Remove the cached datastore reference
        delete this.datastores[name];
        // Delete the data file if it exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }

    listCollections() {
        if (!fs.existsSync(this.dataDir)) {
            return [];
        }
        return fs.readdirSync(this.dataDir)
            .filter(f => f.endsWith('.db'))
            .map(f => f.replace('.db', ''));
    }
}

module.exports = Database;
