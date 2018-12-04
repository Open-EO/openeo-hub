# openEO Hub
This repository contains the source code for [openEO Hub](http://hub.openeo.org), a centralized platform to explore openEO back-end providers.

**It is currently in a rather early stage of development.**

## Goals
openEO Hub tries to implement some ambitious ideas. It is aimed to be a platform that may allow users to:

* find back-ends by collections
* find back-ends supporting required processes, e.g. by submitting a process graph and checking automatically against all back-ends
* find back-ends that support UDFs
* get information about back-ends, e.g. regarding costs
* explore publicly available pre-defined proceses graphs
* explore publicly available containers to run UDFs

## Getting started
This app will soon be deployed at http://hub.openeo.org/.

If you want to set it up yourself, follow these steps:

### Database
1. Install MongoDB, especially `mongod`
2. Start it (with write access to the dbpath) - e.g. `sudo mongod --dbpath /var/lib/mongodb`
3. It should output `waiting for connections on port 27017`

### Frontend and API backend
1. Clone this repo, `cd /path/to/openeo-hub/`
2. `npm install` -> wait...
3. Locally link dependency package with contributions that are necessary for the hub but are not yet published to NPM:
   1. Clone https://github.com/christophfriedrich/openeo-processes-docgen.git, `cd /path/to/openeo-processes-docgen`
   2. `git checkout add-hub-needs`
   2. `npm install`
   3. `npm link`
   4. `cd /path/to/openeo-hub/`
   5. `npm link @openeo/processes-docgen`
3. Edit `config.json` with the URL and name of your DB and the list of backends to crawl
4. `npm run crawl` -> wait until finished with output "DONE!"
5. `npm start`
6. Go to http://localhost:8080/

### For development
There are several start scripts for different dev scenarios:
- `npm run start:frontend` runs a *vue-cli-service* dev server with Hot-Module-Replacement (HMR) - handy when working on the frontend only. Major downside: The backend is not available in this mode (i.e. you can't test API calls).
- `npm run start:backend` starts the *Restify* server, so you can test API calls (e.g. with *Postman*). Frontend-wise it serves whatever is found in the `/dist` directory (i.e. the most recent frontend build).
- `npm run start` builds the frontend to the `dist` directory and *then* starts the *Restify* server, i.e. you can use the latest frontend and make API calls too. But Vue is in production mode, so the *Devtools* are not available.
- `npm run start:dev` therefore builds the frontend to the `dist` directory *in development mode* and then starts the *Restify* server, i.e. you can use the latest frontend, test API calls and use *Devtools* as well. But there's no HMR, so you need to manually restart everytime you want to see your changes.
