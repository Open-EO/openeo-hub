# openEO Hub
This repository contains the source code for [openEO Hub](https://hub.openeo.org), a centralized platform to explore openEO back-end providers.

**It is currently in a rather early stage of development.**

## Goals
openEO Hub tries to implement some ambitious ideas. It is aimed to be a platform that may allow users to:

* find back-ends by collections
* find back-ends supporting required processes, e.g. by submitting a process graph and checking automatically against all back-ends
* find back-ends that support UDFs
* get information about back-ends, e.g. regarding costs
* explore publicly available pre-defined proceses graphs
* explore publicly available containers to run UDFs

## Public API endpoints
The Hub provides its data via a RESTful API under https://hub.openeo.org/api. The following endpoints are intended to be used by the public:

* Metadata about the API
  * `GET /api` -- capabilities document compliant to openEO API v0.4.2.
* Available openEO backends
  * `GET /api/backends` -- the list of *backend provider URLs* that the Hub is configured to crawl (i.e. links to `.well-known` documents where available, otherwise a link directly to the backend OR an object with several links to backends of the same provider).
  * `GET /api/backends?details=full` -- the list of *actual, individual backends* within the Hub's database, including **ALL** their details (i.e. **all** collection descriptions etc.) *This reply can easily be several dozen MBs big.*
  * `GET /api/backends?details=clipped` -- Like `full`, but for collections and processes only the `id`s and `title`s/`summary`s are returned. *This reduces the size **a lot**.*
  * `GET /api/backends?details=grouped` -- Like `clipped`, but the individual backends are grouped by providers.
* Process graphs within the Hub's *Process Graph Repository* (the "Exchange" panel)
  * These endpoints work like the endpoints of a normal openEO backend (compliant to openEO API v0.4.2).
  * `GET /process_graphs` -- lists all process graphs that were submitted to the Hub's repository
  * `GET /process_graphs/{process_graph_id}` -- return the full information for a single process graph
  * `POST /process_graphs` -- add a new process graph to the Hub's repository (note that there's NO update or delete functionality!)

## Getting started
This app is deployed at https://hub.openeo.org/.

If you want to set it up yourself, follow these steps:

### Database
1. Install MongoDB, especially `mongod` (tested with v4.0.4)
2. Start it (with write access to the dbpath) - e.g. `sudo mongod --dbpath /var/lib/mongodb`
3. It should output `waiting for connections on port 27017`

Should you ever want to hard-reset the database (i.e. drop all collections openeo-hub created), use the `drop` script by calling `node drop.js --yesimsure` or `npm run drop -- --yesimsure`. By default, the script leaves collections with user-generated data (e.g. the submitted process graphs) intact. If you want to drop those too, add the `--everything` option.

### Frontend and API backend
1. Clone this repo, `cd /path/to/openeo-hub/`
2. `npm install` -> wait...
3. Edit `config.json`:
   - Specify the URL and name of your MongoDB server and database (required)
   - Specify the backends to crawl (required). This happens via an object with display names as the keys and URLs as the values. The display name is only shown if a backend does not supply one itself. The URLs MUST point to an openEO service that supports well-known discovery, but the specified URL itself MUST NOT contain the trailing `/.well-known/openeo`. The URLs may or may not have a trailing slash.
   - Optional: Change presets for thresholds that control how the crawler handles existing data that is not reachable on re-crawl
4. `npm run crawl` -> wait until finished with output "DONE!" (see below if something doesn't look right or any line starts with "An error...")
5. `npm start`
6. Go to http://localhost:9000/

## Troubleshooting
If errors occur during crawling, this is probably caused by one of the crawled backends (a) returning JSON that is not compliant to the openEO API specification, or (b) malfunctioning under the load of many requests in quick succession. In the first case (a), the `--verbose` option may be helpful to locate the error (be sure to pass the option to the *script* and not to NPM, i.e. call `node crawl.js --verbose` or `npm run crawl -- --verbose`).

## Scheduling re-crawling
On Linux systems, you can use the cron daemon to schedule recurring crawling. For example, adding the following line to `/etc/crontab` executes the crawl script every night at 3:00 am, as the user johndoe: `0 3 * * * johndoe node /path/to/openeo-hub/crawl.js`

## Development
There are several start scripts for different dev scenarios:
- `npm run start:frontend` runs a *vue-cli-service* dev server with Hot-Module-Replacement (HMR) - handy when working on the frontend only. Major downside: The backend is not available in this mode (i.e. you can't test API calls).
- `npm run start:backend` starts the *Restify* server, so you can test API calls (e.g. with *Postman*). Frontend-wise it serves whatever is found in the `/dist` directory (i.e. the most recent frontend build).
- `npm run start` builds the frontend to the `dist` directory and *then* starts the *Restify* server, i.e. you can use the latest frontend and make API calls too. But Vue is in production mode, so the *Devtools* are not available.
- `npm run start:dev` therefore builds the frontend to the `dist` directory *in development mode* and then starts the *Restify* server, i.e. you can use the latest frontend, test API calls and use *Devtools* as well. But there's no HMR, so you need to manually restart everytime you want to see your changes.

The Hub depends on the `openeo-vue-components` repo - if you're simultaneously working on that too and want to see how your changes there work together with the Hub, it's smart to link it:
1. `cd /path/to/openeo-vue-components`
2. `sudo ndm link`
3. `cd /path/to/openeo-hub/`
4. `npm link @openeo/vue-components`

This makes all references to `@openeo/vue-components` in imports etc. point to your current local state of that repo.

Note these caveats:
- If you do `npm install` in the `openeo-hub` folder, the link gets overwritten, so you have to repeat `npm link @openeo/vue-components`.
- If you make changes in the `openeo-vue-components` folder, make sure to run `npm run build` there. Otherwise you're not testing against the version of the code that would *actually end up on NPM* (minified etc.)!
