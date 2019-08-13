<template>
	<div class="backend">
        <a :href="webEditorUrl" target="_blank" class="open-in-web-editor" v-if="!collapsed.root">
            <button>Open in openEO Web Editor</button>
        </a>
        
        <h3 @click="collapsed.root = !collapsed.root">
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
	props: ['backendData', 'initiallyCollapsed', 'isSearchResult'],
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
        },

    computed: {
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

    watch: {
        'collapsed.collections': async function (newValue) {
            if(newValue == false && Array.isArray(this.preparedBackend.collections) && Object.keys(this.preparedBackend.collections[0]).length == 1) {
                let request = await axios.get('/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/collections');
                this.preparedBackend.collections = request.data;
            }
        },
        'collapsed.processes': async function (newValue) {
            if(newValue == false && Array.isArray(this.preparedBackend.processes) && Object.keys(this.preparedBackend.processes[0]).length == 1) {
                let request = await axios.get('/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/processes');
                this.preparedBackend.processes = request.data;
            }
        }
    },

	data() {
		return {
            backend: this.backendData,
            preparedBackend: null,
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
    }
}
</script>

<style scoped>
h3, h4 {
    cursor: pointer;
}
.open-in-web-editor {
    float: right;
}
</style>

<style>
ul.file-formats,
ul.service-types {
    column-width: 10em;
}
</style>
