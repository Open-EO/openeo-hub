<template>
	<div :class="{collapsible: collapsible, backend: 1}">
        <a :href="webEditorUrl" target="_blank" class="open-in-web-editor" v-if="!collapsed.root">
            <button :disabled="webEditorUnavailable" :title="webEditorUnavailable ? 'The openEO Web Editor only supports backends running with openEO API v0.4.0 and later.' : ''">
                Open in openEO Web Editor
            </button>
        </a>
        
        <h3 @click="collapsed.root = collapsible && !collapsed.root">
            <template v-if="collapsible">{{collapsed.root ? '▶' : '▼'}}</template>
            <BackendName :data="backend" :showVersion="showVersion"></BackendName>
        </h3>

        <div v-if="!collapsed.root">

        <Description v-if="preparedBackend.description" :description="preparedBackend.description" :compact="true" class="scroll-if-too-long"></Description>

        <small><code>{{backend.backendUrl}}</code></small>
        
        <UnsuccessfulCrawlNotice :unsuccessfulCrawls="backend.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
        <DataRetrievedNotice :timestamp="backend.retrieved"></DataRetrievedNotice>

        <dl>
            <dt v-if="backend.endpoints" @click="collapsed.functionalities = !collapsed.functionalities">
                <h4>{{collapsed.functionalities ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'Supported'}} functionalities {{supportedFunctionalitiesCount}}</h4>
            </dt>
            <dd v-show="backend.endpoints && !collapsed.functionalities">
                <SupportedFeatures :endpoints="preparedBackend.endpoints" :version="preparedBackend.api_version" ref="supportedFeaturesComponent"></SupportedFeatures>
            </dd>

            <dt v-if="backend.collections" @click="toggleCollections">
                <h4>{{collapsed.collections ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} collections ({{backend.collections.length}})</h4>
            </dt>
            <dd v-if="backend.collections && !collapsed.collections">
                <CollectionWrapper v-for="collection in preparedBackend.collections" :key="collection.name" :collectionData="collection" :version="preparedBackend.api_version" :initiallyCollapsed="true"></CollectionWrapper>
            </dd>
            
            <dt v-if="backend.processes" @click="toggleProcesses">
                <h4>{{collapsed.processes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} processes ({{backend.processes.length}})</h4>
            </dt>
            <dd v-if="preparedBackend.processes && !collapsed.processes">
                <ProcessWrapper v-for="process in backend.processes" :key="process.name || process.id" :processData="process" :version="preparedBackend.api_version" :initiallyCollapsed="true" :provideDownload="false"></ProcessWrapper>
            </dd>

            <dt v-if="backend.outputFormats" @click="collapsed.outputFormats = !collapsed.outputFormats">
                <h4>{{collapsed.outputFormats ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} output formats ({{supportedOutputFormatsCount}})</h4>
            </dt>
            <dd v-if="backend.outputFormats" v-show="!collapsed.outputFormats"> <!-- v-if to prevent errors when outputFormats is not present. If it is present: v-show to always render -> allow retrieval of item count (-> heading) from SupportedFileFormats component -->
                <SupportedFileFormats :formats="preparedBackend.outputFormats" :version="preparedBackend.api_version" ref="supportedFileFormatsComponent"></SupportedFileFormats>
            </dd>

            <dt v-if="backend.serviceTypes" @click="collapsed.serviceTypes = !collapsed.serviceTypes">
                <h4>{{collapsed.serviceTypes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} service types ({{Object.keys(backend.serviceTypes).length}})</h4>
            </dt>
            <dd v-if="backend.serviceTypes && !collapsed.serviceTypes">
                <SupportedServiceTypes :services="preparedBackend.serviceTypes" :version="preparedBackend.api_version"></SupportedServiceTypes>
            </dd>

            <dt v-if="backend.billing" @click="collapsed.billing = !collapsed.billing">
                <h4>{{collapsed.billing ? '▶' : '▼'}} Billing information</h4>
            </dt>
            <dd v-if="backend.billing && !collapsed.billing" class="billing">
                <BillingPlans :billing="backend.billing" :version="preparedBackend.api_version"></BillingPlans>
            </dd>
        </dl>

        </div>
    </div>
</template>

<script>
import BackendName from './BackendName.vue';
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';
import { SupportedFeatures, SupportedFileFormats, SupportedServiceTypes, BillingPlans, Description } from '@openeo/vue-components';
import CollectionWrapper from './CollectionWrapper.vue';
import ProcessWrapper from './ProcessWrapper.vue';
import axios from 'axios';

export default {
	name: 'Backend',
	props: ['backendData', 'collapsible', 'initiallyCollapsed', 'isSearchResult', 'showVersion'],
	components: {
        BackendName,
        Description,
        SupportedFeatures,
        SupportedFileFormats,
        SupportedServiceTypes,
        BillingPlans,
        DataRetrievedNotice,
        UnsuccessfulCrawlNotice,
        CollectionWrapper,
        ProcessWrapper
    },

    created() {
        var original = this.backend;

        // normalizing of `processes` array entries (via `convertProcessToLatestSpec`) is done by the Process component

        // don't touch search result because order may be important
        // but when we get a long list for the discovery section having it sorted alphabetically is very handy
        if(!this.isSearchResult) {
            const sortCallback = (e1, e2) => e1.toLowerCase() > e2.toLowerCase();
            const sortCallbackName = (e1, e2) => (e1.id || e1.name).toLowerCase() > (e2.id || e2.name).toLowerCase();
            // ternary operator check in case the property is `null`
            original.collections = original.collections ? original.collections.sort(sortCallbackName) : null;
            original.processes = original.processes ? original.processes.sort(sortCallbackName) : null;
        }

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
        this.preparedBackend.api_version = this.preparedBackend.api_version || this.preparedBackend.version;
    },

    computed: {
        webEditorUrl() {
            var protocol = 'https:';
            if (this.backend.backendUrl.toLowerCase().substr(0,5) === 'http:') {
                protocol = 'http:';
            }
            return protocol + '//editor.openeo.org/?server=' + encodeURIComponent(this.backend.backendUrl)
        },
        webEditorUnavailable() {
            // unavailable if api_version is known and starts with '0.3' (treat as available if api_version is not known)
            return (this.preparedBackend.api_version && this.preparedBackend.api_version.substr(0,3) == '0.3');
        }
    },

    mounted: function() {
        if(this.$refs.supportedFeaturesComponent != undefined) {
            const supported = this.$refs.supportedFeaturesComponent.getSupportedFeatureCount();
            const total = this.$refs.supportedFeaturesComponent.getFeatureCount();
            this.supportedFunctionalitiesCount = '(' + supported + '/' + total + ')';
        }
        this.$nextTick(() => {  // wrap in next tick because it accesses a computed property
            if(this.$refs.supportedFileFormatsComponent != undefined) {
                this.supportedOutputFormatsCount = Object.keys(this.$refs.supportedFileFormatsComponent.outputFormats).length;
            }
        });
    },

	data() {
		return {
            backend: this.backendData,
            preparedBackend: null,
            collapsed: {
                root: (this.collapsible || false) && (this.initiallyCollapsed || false),
                functionalities: false,
                collections: true,
                processes: true,
                outputFormats: true,
                serviceTypes: true,
                billing: true
            },
            supportedFunctionalitiesCount: '',
            supportedOutputFormatsCount: undefined
		};
    },

    methods: {
        async toggleCollections() {
            if(this.collapsed.collections && Array.isArray(this.preparedBackend.collections) && this.preparedBackend.collections.length > 0 && Object.keys(this.preparedBackend.collections[0]).length == 1) {
                document.body.classList.add('loading');
                let request = await axios.get('/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/collections');
                this.preparedBackend.collections = request.data;
                document.body.classList.remove('loading');
            }
            this.collapsed.collections = !this.collapsed.collections;
        },

        async toggleProcesses() {
            if(this.collapsed.processes && Array.isArray(this.preparedBackend.processes) && this.preparedBackend.processes.length > 0 && Object.keys(this.preparedBackend.processes[0]).length == 1) {
                document.body.classList.add('loading');
                let request = await axios.get('/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/processes');
                this.preparedBackend.processes = request.data;
                document.body.classList.remove('loading');
            }
            this.collapsed.processes = !this.collapsed.processes;
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
body.loading h3, body.loading h4 {
    cursor: wait;
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
</style>

<style>
ul.file-formats,
ul.service-types {
    column-width: 10em;
}
</style>
