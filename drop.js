const config = require('./config.json');
const assert = require('assert');
const MongoClient = require('mongodb').MongoClient;
const mongo = new MongoClient(config.dbUrl, { useNewUrlParser: true, useUnifiedTopology: true } );
console.log('Connecting to database server...');
mongo.connect((error, client) => {
    if(error != null) {
        console.log(`An error occurred while connecting to the database server (${error.name}: ${error.message})`);
        console.log('');
        console.log('DROPPING ABORTED!')
        return 1;  // abort with non-zero exit code
    }
    
    console.log('Connected.');
    const db = client.db(config.dbName);

    const userIsSure = process.argv[2] == '--yesimsure'  || process.argv[3] == '--yesimsure';
    const dropEverything = process.argv[2] == '--everything' || process.argv[3] == '--everything';

    if(!userIsSure) {
        console.log('You must start the script with --yesimsure parameter to take effect');
        console.log('I.e. you must call `node drop.js --yesimsure` or `npm run drop -- --yesimsure`)');
        console.log('Exiting without doing anything.');
        mongo.close().catch(console.log);
    } else {
        var collectionsToDrop = ['raw', 'backends', 'collections', 'processes'];
        if(dropEverything) {
            collectionsToDrop.push('process_graphs');
        }
        db.listCollections({name: {$in: collectionsToDrop}}, {nameOnly: true}).toArray()
        .then(colls => {
            if(colls.length == 0) {
                console.log('No collections exist that could be dropped.')
                console.log('Exiting without doing anything.');
                mongo.close().catch(console.log);
            } else {
                Promise
                .all(colls.map(c => db.dropCollection(c.name).catch(console.log)))
                .then(() => console.log('Successfully dropped all collections' + (dropEverything ? '' : ' (except user-generated content)') + '.'))
                .catch(e => console.log(e))
                .then(() => mongo.close().catch(console.log));  // always executed
            }
        })
        .catch(e => {console.log(e); mongo.close().catch(console.log); });
    }
});
