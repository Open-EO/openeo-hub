const fs = require('fs');
const path = require('path');
const config = require('./config.js');

const userIsSure = process.argv[2] == '--yesimsure'  || process.argv[3] == '--yesimsure';

if(!userIsSure) {
    console.log('You must start the script with --yesimsure parameter to take effect');
    console.log('I.e. you must call `node drop.js --yesimsure` or `npm run drop -- --yesimsure`)');
    console.log('Exiting without doing anything.');
} else {
    var collectionsToDrop = ['raw', 'backends', 'collections', 'processes'];

    let dropped = 0;
    for (const name of collectionsToDrop) {
        const filePath = path.join(config.dataDir, name + '.db');
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Dropped collection: ' + name);
            dropped++;
        }
    }

    if (dropped === 0) {
        console.log('No collections exist that could be dropped.');
        console.log('Exiting without doing anything.');
    } else {
        console.log('Successfully dropped all collections.');
    }
}
