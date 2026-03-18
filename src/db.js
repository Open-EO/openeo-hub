const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

// NeDB forbids:
//   - field names starting with '$'  (e.g. $schema, $ref from JSON-Schema)
//   - field names containing '.'     (e.g. version keys like "Python 3.8")
// We transparently replace these characters with fullwidth equivalents on
// write and restore them on read so callers always see the original data.
const ENCODE_MAP = {
    '$': '\uff04',  // $ → ＄ (U+FF04, fullwidth dollar sign) — only at start of key
    '.': '\uff0e',  // . → ．(U+FF0E, fullwidth full stop)
};

const DECODE_MAP = {};
for (const [orig, replacement] of Object.entries(ENCODE_MAP)) {
    DECODE_MAP[replacement] = orig;
}

function encodeKey(key) {
    // Replace leading '$' with fullwidth equivalent
    if (key.length > 0 && key[0] === '$') {
        key = ENCODE_MAP['$'] + key.slice(1);
    }
    // Replace all '.' with fullwidth equivalent
    if (key.indexOf('.') !== -1) {
        key = key.split('.').join(ENCODE_MAP['.']);
    }
    return key;
}

function decodeKey(key) {
    // Restore leading fullwidth dollar to '$'
    if (key.length > 0 && key[0] === ENCODE_MAP['$']) {
        key = '$' + key.slice(1);
    }
    // Restore all fullwidth full stops to '.'
    if (key.indexOf(ENCODE_MAP['.']) !== -1) {
        key = key.split(ENCODE_MAP['.']).join('.');
    }
    return key;
}

function encodeDoc(obj) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof RegExp) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(encodeDoc);
    }
    const out = {};
    for (const key of Object.keys(obj)) {
        out[encodeKey(key)] = encodeDoc(obj[key]);
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
        out[decodeKey(key)] = decodeDoc(obj[key]);
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
