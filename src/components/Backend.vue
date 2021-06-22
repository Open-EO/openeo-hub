<template>
	<div :class="{collapsible: collapsible, backend: 1}">
        <a :href="webEditorUrl" target="_blank" class="open-in-web-editor" v-if="!collapsed.root">
            <button :disabled="webEditorUnavailable" :title="webEditorUnavailable ? 'The openEO Web Editor only supports backends running with openEO API v0.4.0 and later.' : ''">
                Open in openEO Web Editor
            </button>
        </a>
        
        <h3 @click="collapsed.root = collapsible && !collapsed.root">
            <template v-if="collapsible">{{collapsed.root ? '▸' : '▾'}}</template>
            <div class="backendname" v-if="backend.backendTitle">
                <em :title="backend.backendUrl">
                    {{backend.backendTitle}}
                </em>
                <template v-if="showVersion">
                    | v{{backend.api_version}}
                </template>
            </div>
        </h3>

        <div v-if="!collapsed.root" class="backend-body">

        <Description v-if="preparedBackend.description" :description="preparedBackend.description" :compact="true" class="scroll-if-too-long"></Description>

        <LinkList :links="preparedBackend.links" :ignoreRel="['self', 'version-history', 'conformance', 'data']"></LinkList>

        <p><small>URL: <code>{{backend.backendUrl}}</code></small></p>
        
        <UnsuccessfulCrawlNotice :unsuccessfulCrawls="backend.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
        <DataRetrievedNotice :timestamp="backend.retrieved"></DataRetrievedNotice>
        <div v-if="preparedBackend.api_version > '1' && !preparedBackend.production" class="warning">⚠ This service is NOT production-ready.</div>
        <div v-if="preparedBackend.api_version > '1' &&  preparedBackend.production" class="info">✔️ This service is production-ready.</div>

        <SupportedFeatures v-if="backend.endpoints" :endpoints="preparedBackend.endpoints"></SupportedFeatures>
        <Collections  v-if="backend.collections"  :collapsed="true" @headingToggled="toggleCollections" @detailsToggled="toggleCollection" :collections="preparedBackend.collections" :mapOptions="{scrollWheelZoom: false, wrapAroundAntimeridian: false}">
            <template #collection-before-description="props">
                <UnsuccessfulCrawlNotice :unsuccessfulCrawls="props.data.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
                <DataRetrievedNotice :timestamp="props.data.retrieved"></DataRetrievedNotice>
            </template>
            <template #collection-temporal-extents="props">
                <div v-for="extent in props.extents">
                    <div v-if="extent[0] == extent[1]">
                        <FormattedTimestamp :timestamp="extent[0]"></FormattedTimestamp>
                    </div>
                    <div v-else-if="extent[0] == null">
                        Until <FormattedTimestamp :timestamp="extent[1]"></FormattedTimestamp>
                    </div>
                    <div v-else-if="extent[1] == null">
                        <FormattedTimestamp :timestamp="extent[0]"></FormattedTimestamp> until present
                    </div>
                    <div v-else>
                        <FormattedTimestamp :timestamp="extent[0]"></FormattedTimestamp>
                        &ndash;
                        <FormattedTimestamp :timestamp="extent[1]"></FormattedTimestamp>
                    </div>
                </div>
            </template>
        </Collections>
        <Processes    v-if="backend.processes"    :collapsed="true" @headingToggled="toggleProcesses" :processes="backend.processes" :provideDownload="false"></Processes>
        <FileFormats  v-if="backend.fileFormats"  :collapsed="true" :searchTerm="''" :formats="preparedBackend.fileFormats" :showInput="true" :showOutput="true"></FileFormats>
        <ServiceTypes v-if="backend.serviceTypes" :collapsed="true" :searchTerm="''" :services="preparedBackend.serviceTypes"></ServiceTypes>
        <UdfRuntimes  v-if="backend.udfRuntimes"  :collapsed="true" :searchTerm="''" :runtimes="preparedBackend.udfRuntimes"></UdfRuntimes>

        <div v-if="backend.billing" :class="{billing: 1, expanded: !collapsed.billing}">
            <h4 @click="collapsed.billing = !collapsed.billing">Billing Information</h4>
            <BillingPlans v-if="backend.billing && !collapsed.billing" :billing="backend.billing" :heading="null"></BillingPlans>
        </div>

        </div>
    </div>
</template>

<script>
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';
import FormattedTimestamp from './FormattedTimestamp.vue';
import SupportedFeatures from '@openeo/vue-components/components/SupportedFeatures.vue';
import FileFormats from '@openeo/vue-components/components/FileFormats.vue';
import ServiceTypes from '@openeo/vue-components/components/ServiceTypes.vue';
import UdfRuntimes from '@openeo/vue-components/components/UdfRuntimes.vue';
import BillingPlans from '@openeo/vue-components/components/BillingPlans.vue';
import Description from '@openeo/vue-components/components/Description.vue';
import LinkList from '@openeo/vue-components/components/LinkList.vue';
import Collections from '@openeo/vue-components/components/Collections.vue';
import Processes from '@openeo/vue-components/components/Processes.vue';
import axios from 'axios';

export default {
	name: 'Backend',
	props: ['backendData', 'collapsible', 'initiallyCollapsed', 'showVersion'],
	components: {
        Description,
        LinkList,
        SupportedFeatures,
        FileFormats,
        ServiceTypes,
        UdfRuntimes,
        BillingPlans,
        DataRetrievedNotice,
        UnsuccessfulCrawlNotice,
        FormattedTimestamp,
        Collections,
        Processes
    },

    created() {
        var original = this.backend;

        // normalizing of `processes` array entries (via `convertProcessToLatestSpec`) is done by the Process component

        if(original.endpoints) {
            // convert `endpoints` array from `['METHOD path', 'METHOD2 path', ...]` format into `[{path:'path', methods:['METHOD','METHOD2']}, ...]` format
            let inOtherFormat = [];
            original.endpoints.forEach(e => {
                let splitted = e.split(' ');
                let index = inOtherFormat.findIndex(x => x.path == splitted[1]);
                if(index > -1) {
                    inOtherFormat[index].methods.push(splitted[0]);
                } else {
                    inOtherFormat.push({path: splitted[1], methods: [splitted[0]]});
                }
            });
            original.endpoints = inOtherFormat;
        }

        this.preparedBackend = original;
    },

    computed: {
        webEditorUrl() {
            var version = '';   // no need to specify a version for 1.0 (default)
            if(this.backend.api_version.startsWith('0.4')) {
                version = '0.4/';
            }
            return 'https://editor.openeo.org/' + version + '?server=' + encodeURIComponent(this.backend.backendUrl);
        },
        webEditorUnavailable() {
            // unavailable if api_version is known and starts with '0.3' (treat as available if api_version is not known)
            return (this.preparedBackend.api_version && this.preparedBackend.api_version.substr(0,3) == '0.3');
        }
    },

	data() {
		return {
            backend: this.backendData,
            preparedBackend: null,
            collapsed: {
                root: (this.collapsible || false) && (this.initiallyCollapsed || false),
                billing: true
            }
		};
    },

    methods: {
        async toggleCollection(expanded, key, identifier, data) {
            // get the detailed information about the collection
            let request = await axios.get('/api/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/collections/'+encodeURIComponent(encodeURIComponent(identifier)));
            // find the corresponding entry in the supplied data
            let datapoint = this.preparedBackend.collections.find(c => c.id == identifier);
            // loop through keys because `this.$set(data, key, request.data)` doesn't work properly
            Object.keys(request.data).forEach(k => this.$set(datapoint, k, request.data[k]));
        },

        async toggleCollections() {
            if(Array.isArray(this.preparedBackend.collections) && this.preparedBackend.collections.length > 0 && Object.keys(this.preparedBackend.collections[0]).length == 1) {
                document.body.classList.add('loading');
                let request = await axios.get('/api/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/collections');
                this.preparedBackend.collections = request.data;
                document.body.classList.remove('loading');
            }
        },

        async toggleProcesses() {
            if(Array.isArray(this.preparedBackend.processes) && this.preparedBackend.processes.length > 0 && Object.keys(this.preparedBackend.processes[0]).length == 1) {
                document.body.classList.add('loading');
                let request = await axios.get('/api/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/processes');
                this.preparedBackend.processes = request.data;
                document.body.classList.remove('loading');
            }
        }
    }
}
</script>

<style scoped>
.collapsible h3 {
    cursor: pointer;
}
h4 {
    cursor: pointer;
}
.open-in-web-editor {
    float: right;
}
.open-in-web-editor button:disabled {
    cursor: not-allowed;
}

.scroll-if-too-long {
    max-height: 15em;
    overflow-y: auto;
}

.vue-component {
	margin-bottom: 10px;
}

div.warning {
    color: #d59800;  /* dark yellow */
    margin-top: 10px;
}
div.info {
    color: green;
    margin-top: 10px;
}

.billing {
    padding-left: 40px;  /* to indent content */
}
.billing h4 {
    margin-left: -40px;  /* to reverse indentation for heading */
    padding-left: 1em;   /* to make room for the collapsing arrow */
}
.billing h4:before {     /* taken from openeo-vue-components/components/SearchableList.vue */
	content: "▸";
	margin-left: -1em;
	float: left;
	font-size: 1em;
}
.billing.expanded h4:before {    /* also taken from there */
	content: "▾";
}
</style>

<style>
.backend-body > .vue-component > .searchable-list > .body,
.backend-body > .vue-component.features > ul {
    margin-left: 40px;   /* to indent content */
}

body.loading h2, body.loading h3, body.loading h4, body.loading .summary {
    cursor: wait !important;
}

.link-list ul {
    margin-top: 5px;
    padding-left: 20px;
}
.link-list li {
    float: left;
    margin-right: 50px;
}
.link-list:after {
    /* classic clearfix -- could be replaced by a `display: flow-root` solution once support for it improves */
    content: "";
    display: table;
    clear: both;
}
</style>
