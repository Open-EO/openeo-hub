# openEO Hub
This repository contains the source code for [openEO Hub](https://hub.openeo.org), a centralized platform to explore openEO service providers.

**It is currently in a maintenance mode.**

## Goals
openEO Hub tries to implement some ambitious ideas. It is aimed to be a platform that may allow users to:

* find services by collections
* find services supporting required processes, e.g. by submitting a process graph and checking automatically against all services
* find services that support UDFs and which runtimes they offer
* get information about services, e.g. regarding costs

## Public API endpoints
The Hub provides its data via a RESTful API under https://hub.openeo.org/api. The following endpoints are intended to be used by the public:

* Metadata about the API
  * `GET /api` -- capabilities document compliant to openEO API v1.0.0.
* Available openEO services
  * `GET /api/backends` -- the list of *service provider URLs* that the Hub is configured to crawl (i.e. links to `.well-known` documents where available, otherwise a link directly to the service OR an object with several links to services of the same provider).
  * `GET /api/backends?details=full` -- the list of *actual, individual services* within the Hub's database, including **ALL** their details (i.e. **all** collection descriptions etc.) *This reply can easily be several dozen MBs big.*
  * `GET /api/backends?details=clipped` -- Like `full`, but for collections and processes only the `id`s and `title`s/`summary`s are returned. *This reduces the size **a lot**.*
  * `GET /api/backends?details=grouped` -- Like `clipped`, but the individual services are grouped by providers.

## Getting started
This app is deployed at https://hub.openeo.org/.

If you want to set it up yourself, follow these steps:

### Requirements
Required is Node.js (at least version 20). No external database server is needed — the Hub uses an embedded database ([NeDB](https://github.com/seald/nedb)) that stores data in the `data/` directory.

### Frontend and API backend
1. Clone this repo, `cd /path/to/openeo-hub/`
2. `npm install`
3. Edit `config.js`:
   - Specify the services to crawl (required). This happens via an object with display names as the keys and URLs as the values. The display name is only shown if a service does not supply one itself. The URLs MUST point to an openEO service that supports well-known discovery, but the specified URL itself MUST NOT contain the trailing `/.well-known/openeo`. The URLs may or may not have a trailing slash.
   - Optional: Change the `dataDir` (default: `./data`) to specify where the database files are stored
   - Optional: Change presets for thresholds that control how the crawler handles existing data that is not reachable on re-crawl
4. `npm run crawl` -> wait until finished with output "DONE!" (see below if something doesn't look right or any line starts with "An error...")
5. `npm start`
6. Go to <http://localhost:9000/>

### Setting up cron jobs

Add to your cron job:

```crontab
# Recrawl openEO services every day at 01:00
0 1 * * * cd ~/openeo-hub && npm run crawl && npm run up
```

### Dropping the database
Should you ever want to hard-reset the database (i.e. drop all collections openeo-hub created), use the `drop` script by calling `node drop.js --yesimsure` or `npm run drop -- --yesimsure`.

## Troubleshooting
If errors occur during crawling, this is probably caused by one of the crawled services (a) returning JSON that is not compliant to the openEO API specification, or (b) malfunctioning under the load of many requests in quick succession. In the first case (a), the `--verbose` option may be helpful to locate the error (be sure to pass the option to the *script* and not to NPM, i.e. call `node crawl.js --verbose` or `npm run crawl -- --verbose`).

## Scheduling re-crawling
On Linux systems, you can use the cron daemon to schedule recurring crawling. For example, adding the following line to `/etc/crontab` executes the crawl script every night at 3:00 am, as the user johndoe: `0 3 * * * johndoe node /path/to/openeo-hub/crawl.js`

## Development
There are several start scripts for different dev scenarios:
- `npm run start:frontend` runs a *vue-cli-service* dev server with Hot-Module-Replacement (HMR) - handy when working on the frontend only. Major downside: The backend is not available in this mode (i.e. you can't test API calls).
- `npm run start:backend` starts the *Express* server, so you can test API calls (e.g. with *Postman*). Frontend-wise it serves whatever is found in the `/dist` directory (i.e. the most recent frontend build).
- `npm run start` builds the frontend to the `dist` directory and *then* starts the *Express* server, i.e. you can use the latest frontend and make API calls too. But Vue is in production mode, so the *Devtools* are not available.
- `npm run start:dev` therefore builds the frontend to the `dist` directory *in development mode* and then starts the *Express* server, i.e. you can use the latest frontend, test API calls and use *Devtools* as well. But there's no HMR, so you need to manually restart everytime you want to see your changes.

The Hub depends on the `openeo-vue-components` repo - if you're simultaneously working on that too and want to see how your changes there work together with the Hub, it's smart to link it:
1. `cd /path/to/openeo-vue-components`
2. `sudo npm link`
3. `cd /path/to/openeo-hub/`
4. `npm link @openeo/vue-components`

This makes all references to `@openeo/vue-components` in imports etc. point to your current local state of that repo.

Note these caveats:
- If you do `npm install` in the `openeo-hub` folder, the link gets overwritten, so you have to repeat `npm link @openeo/vue-components`.
- If you make changes in the `openeo-vue-components` folder, make sure to run `npm run build` there. Otherwise you're not testing against the version of the code that would *actually end up on NPM* (minified etc.)!
