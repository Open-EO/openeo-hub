const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

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
        return this.getCollection(collectionName).insertAsync(doc);
    }

    async findOne(query, collectionName) {
        return this.getCollection(collectionName).findOneAsync(query);
    }

    async find(query, collectionName) {
        return this.getCollection(collectionName).findAsync(query);
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
