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
This app is deployed at http://hub.openeo.org/.

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
   - Specify the list of backends to crawl (required; specify backend URLs without trailing slash!)
   - Optional: Change presets for thresholds that control how the crawler handles existing data that is not reachable on re-crawl
4. `npm run crawl` -> wait until finished with output "DONE!" (see below if something doesn't look right or any line starts with "An error...")
5. `npm start`
6. Go to http://localhost:9000/

## Troubleshooting
If errors occur during crawling, this is probably caused by one of the crawled backends (a) returning JSON that is not compliant to the openEO API specification, or (b) malfunctioning under the load of many requests in quick succession. In the first case (a), the `--verbose` option may be helpful to locate the error (be sure to pass the option to the *script* and not to NPM, i.e. call `node crawl.js --verbose` or `npm run crawl -- --verbose`).

## Scheduling re-crawling
On Linux systems, you can use the cron daemon to schedule recurring crawling. For example, adding the following line to `/etc/crontab` executes the crawl script every six hours, as the user johndoe: `0 */6 * * * johndoe node /path/to/openeo-hub/crawl.js`

## Development
There are several start scripts for different dev scenarios:
- `npm run start:frontend` runs a *vue-cli-service* dev server with Hot-Module-Replacement (HMR) - handy when working on the frontend only. Major downside: The backend is not available in this mode (i.e. you can't test API calls).
- `npm run start:backend` starts the *Restify* server, so you can test API calls (e.g. with *Postman*). Frontend-wise it serves whatever is found in the `/dist` directory (i.e. the most recent frontend build).
- `npm run start` builds the frontend to the `dist` directory and *then* starts the *Restify* server, i.e. you can use the latest frontend and make API calls too. But Vue is in production mode, so the *Devtools* are not available.
- `npm run start:dev` therefore builds the frontend to the `dist` directory *in development mode* and then starts the *Restify* server, i.e. you can use the latest frontend, test API calls and use *Devtools* as well. But there's no HMR, so you need to manually restart everytime you want to see your changes.

The Hub depends on the `openeo-processes-docgen` repo - if you're simultaneously working on that too and want to see how your changes there work together with the Hub, it's smart to link it:
1. `cd /path/to/openeo-processes-docgen`
2. `sudo ndm link`
3. `cd /path/to/openeo-hub/`
4. `npm link @openeo/processes-docgen`

This makes all references to `@openeo/processes-docgen` in imports etc. point to your current local state of that repo.

Note these caveats:
- If you do `npm install` in the `openeo-hub` folder, the link gets overwritten, so you have to repeat `npm link @openeo/processes-docgen`.
- If you make changes in the `openeo-processes-docgen` folder, make sure to run `npm run build_lib` there. Otherwise you're not testing against the version of the code that would *actually end up on NPM* (minified etc.)!
