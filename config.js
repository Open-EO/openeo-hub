module.exports = {
    dataDir: './data',
    backends: {
        "openEO Platform": "https://openeo.cloud/",
        "Google Earth Engine": "https://earthengine.openeo.org/",
        "EURAC": "https://openeo.eurac.edu/",
        "TerraScope": "https://openeo.terrascope.be/",
        "EODC": "https://openeo.eodc.eu/",
        // mundials was offline last time we checked, might have been discontinued
        // "mundialis": "https://openeo.mundialis.de/",
        "Sentinel Hub": "https://openeo.sentinel-hub.com/production/",
        "Copernicus Data Space Ecosystem": "https://openeo.dataspace.copernicus.eu/",
        "Copernicus Data Space Ecosystem Federation": "https://openeofed.dataspace.copernicus.eu",
        "rasdaman": "https://openeo.rasdaman.com/rasdaman/openeo/",
        "EO4EU Platform": "https://umm-api.apps.eo4eu.eu/EO/",
        // Potential other backends to add: RISE, IBM
    },
    unsuccessfulCrawls: {
        flagAfter: 2,
        deleteAfter: 14
    },
    flagWhenOlderThanXHours: 24
};
