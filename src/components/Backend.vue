<template>
	<div class="backend">
        <div class="invalidConfigurationWarning" v-if="clippedDataSupplied && !initiallyCollapsed"><strong>It is not allowed to supply clipped data but not initially collapse the component! This is because lazy-loading of the full data is coupled to the expanding mechanism.</strong></div>
        <div class="invalidConfigurationWarning" v-if="clippedDataSupplied && isSearchResult"><strong>It is not allowed to supply clipped data when this data represents a search result! This is because lazy-loading of the full data is only possible for the "default" representation of a backend, not for search results.</strong></div>

        <a :href="webEditorUrl" target="_blank" class="open-in-web-editor" v-if="!collapsed.root">
            <button>Open in openEO Web Editor</button>
        </a>
        
        <h3 @click="expand">
            {{collapsed.root ? '▶' : '▼'}}
            <BackendName :data="backend"></BackendName>
        </h3>

        <div v-if="!collapsed.root">

        <small><code>{{backend.backendUrl}}</code></small>
        
        <UnsuccessfulCrawlNotice :unsuccessfulCrawls="backend.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
        <DataRetrievedNotice :timestamp="backend.retrieved"></DataRetrievedNotice>

        <dl>
            <dt v-if="backend.endpoints" @click="collapsed.functionalities = !collapsed.functionalities">
                <h4>{{collapsed.functionalities ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'Supported'}} functionalities {{supportedFunctionalitiesCount}}</h4>
            </dt>
            <dd v-show="backend.endpoints && !collapsed.functionalities">
                <SupportedFeatures :endpoints="preparedBackend.endpoints" ref="supportedFeaturesComponent"></SupportedFeatures>
            </dd>

            <dt v-if="backend.collections" @click="collapsed.collections = !collapsed.collections">
                <h4>{{collapsed.collections ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} collections ({{backend.collections.length}})</h4>
            </dt>
            <dd v-if="backend.collections && !collapsed.collections">
                <CollectionWrapper v-for="collection in preparedBackend.collections" :key="collection.name" :collectionData="collection" :initiallyCollapsed="true"></CollectionWrapper>
            </dd>
            
            <dt v-if="backend.processes" @click="collapsed.processes = !collapsed.processes">
                <h4>{{collapsed.processes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} processes ({{backend.processes.length}})</h4>
            </dt>
            <dd v-if="preparedBackend.processes && !collapsed.processes">
                <ProcessWrapper v-for="process in backend.processes" :key="process.name || process.id" :processData="process" :initiallyCollapsed="true" :provideDownload="false"></ProcessWrapper>
            </dd>

            <dt v-if="backend.outputFormats" @click="collapsed.outputFormats = !collapsed.outputFormats">
                <h4>{{collapsed.outputFormats ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} output formats ({{Object.keys(backend.outputFormats).length}})</h4>
            </dt>
            <dd v-if="backend.outputFormats && !collapsed.outputFormats">
                <SupportedFileFormats :formats="preparedBackend.outputFormats"></SupportedFileFormats>
            </dd>

            <dt v-if="backend.serviceTypes" @click="collapsed.serviceTypes = !collapsed.serviceTypes">
                <h4>{{collapsed.serviceTypes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} service types ({{Object.keys(backend.serviceTypes).length}})</h4>
            </dt>
            <dd v-if="backend.serviceTypes && !collapsed.serviceTypes">
                <SupportedServiceTypes :services="preparedBackend.serviceTypes"></SupportedServiceTypes>
            </dd>

            <dt v-if="backend.billing" @click="collapsed.billing = !collapsed.billing">
                <h4>{{collapsed.billing ? '▶' : '▼'}} Billing information</h4>
            </dt>
            <dd v-if="backend.billing && !collapsed.billing" class="billing">
                <BillingPlans :billing="backend.billing"></BillingPlans>
            </dd>
        </dl>

        </div>
    </div>
</template>

<script>
import BackendName from './BackendName.vue';
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';
import { SupportedFeatures, SupportedFileFormats, SupportedServiceTypes, BillingPlans } from '@openeo/vue-components';
import CollectionWrapper from './CollectionWrapper.vue';
import ProcessWrapper from './ProcessWrapper.vue';
import axios from 'axios';

export default {
	name: 'Backend',
	props: ['backendData', 'clippedDataSupplied', 'initiallyCollapsed', 'isSearchResult'],
	components: {
        BackendName,
        SupportedFeatures,
        SupportedFileFormats,
        SupportedServiceTypes,
        BillingPlans,
        DataRetrievedNotice,
        UnsuccessfulCrawlNotice,
        CollectionWrapper,
        ProcessWrapper
    },
    computed: {
        preparedBackend() {
            var original = this.backend;

            // normalizing of `processes` array entries (via `convertProcessToLatestSpec`) is done by the Process component

            // the file types and service names are stored as the keys of the objects
            original.outputFormats = original.outputFormats ? Object.keys(original.outputFormats) : null;
            original.serviceTypes = original.serviceTypes ? Object.keys(original.serviceTypes) : null;

            // don't touch search result because order may be important
            // but when we get a long list for the discovery section having it sorted alphabetically is very handy
            if(!this.isSearchResult) {
                const sortCallback = (e1, e2) => e1.toLowerCase() > e2.toLowerCase();
                const sortCallbackName = (e1, e2) => (e1.id || e1.name).toLowerCase() > (e2.id || e2.name).toLowerCase();
                // ternary operator check in case the property is `null`
                original.collections = original.collections ? original.collections.sort(sortCallbackName) : null;
                original.processes = original.processes ? original.processes.sort(sortCallbackName) : null;
                original.outputFormats = original.outputFormats ? original.outputFormats.sort(sortCallback) : null;
                original.serviceTypes = original.serviceTypes ? original.serviceTypes.sort(sortCallback) : null;
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

            return original;
        },

        webEditorUrl() {
            var protocol = 'https:';
            if (this.backend.backendUrl.toLowerCase().substr(0,5) === 'http:') {
                protocol = 'http:';
            }
            return protocol + '//editor.openeo.org/?server=' + encodeURIComponent(this.backend.backendUrl)
        },
    },

    mounted: function() {
        if(this.$refs.features != undefined) {
            const supported = this.$refs.supportedFeaturesComponent.getSupportedFeatureCount();
            const total = this.$refs.supportedFeaturesComponent.getFeatureCount();
            this.supportedFunctionalitiesCount = '(' + supported + '/' + total + ')';
        }
    },

	data() {
		return {
            backend: this.backendData,
            dataComplete: this.clippedDataSupplied != true,
            collapsed: {
                root: this.initiallyCollapsed || false,
                functionalities: false,
                collections: true,
                processes: true,
                outputFormats: true,
                serviceTypes: true,
                billing: true
            },
            supportedFunctionalitiesCount: ''
		};
    },

    methods: {
        async expand() {
            // lazy-load full data if necessary
            if(!this.dataComplete) {
                let fullData = await axios.get('/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl)));  // double-encode to avoid Apache problem (automatic decoding of slashes in URL parameter -> Apache looks for wrong directory -> 404 errors)
                this.backend = fullData.data;
                this.dataComplete = true;
            }
            // actual expanding
            this.collapsed.root = !this.collapsed.root;
        }
    }
}
</script>

<style scoped>
h3, h4 {
    cursor: pointer;
}
ul.functionalities {
    list-style: none;
}
ul.output-formats,
ul.service-types {
    column-width: 10em;
}
.open-in-web-editor {
    float: right;
}
.invalidConfigurationWarning {
    background-color: red;
    font-size: 20pt;
    padding: 10px;
    margin-bottom: 10px;
}
</style>
