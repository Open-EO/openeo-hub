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

        <div v-if="!collapsed.root">

        <Description v-if="preparedBackend.description" :description="preparedBackend.description" :compact="true" class="scroll-if-too-long"></Description>

        <LinkList :links="preparedBackend.links" :ignoreRel="['self', 'version-history', 'conformance', 'data']"></LinkList>

        <p><small>URL: <code>{{backend.backendUrl}}</code></small></p>
        
        <UnsuccessfulCrawlNotice :unsuccessfulCrawls="backend.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
        <DataRetrievedNotice :timestamp="backend.retrieved"></DataRetrievedNotice>
        <div v-if="preparedBackend.api_version > '1' && !preparedBackend.production" class="warning">⚠ This service is NOT production-ready.</div>
        <div v-if="preparedBackend.api_version > '1' &&  preparedBackend.production" class="info">✔️ This service is production-ready.</div>

        <dl>
            <dt v-if="backend.endpoints" @click="collapsed.functionalities = !collapsed.functionalities">
                <h4>{{collapsed.functionalities ? '▸' : '▾'}} {{isSearchResult ? 'Matched' : 'Supported'}} functionalities {{supportedFunctionalitiesCount}}</h4>
            </dt>
            <dd v-show="backend.endpoints && !collapsed.functionalities">
                <SupportedFeatures :endpoints="preparedBackend.endpoints" :version="preparedBackend.api_version" ref="supportedFeaturesComponent"></SupportedFeatures>
            </dd>

            <dt v-if="backend.collections" @click="toggleCollections">
                <h4>{{collapsed.collections ? '▸' : '▾'}} {{isSearchResult ? 'Matched' : 'All'}} collections ({{backend.collections.length}})</h4>
            </dt>
            <dd v-if="backend.collections && !collapsed.collections">
                <CollectionWrapper v-for="collection in preparedBackend.collections" :key="collection.id" :collectionData="collection" :version="preparedBackend.api_version" :initiallyCollapsed="true"></CollectionWrapper>
            </dd>
            
            <dt v-if="backend.processes" @click="toggleProcesses">
                <h4>{{collapsed.processes ? '▸' : '▾'}} {{isSearchResult ? 'Matched' : 'All'}} processes ({{backend.processes.length}})</h4>
            </dt>
            <dd v-if="preparedBackend.processes && !collapsed.processes">
                <ProcessWrapper v-for="process in backend.processes" :key="process.id" :processData="process" :version="preparedBackend.api_version" :initiallyCollapsed="true" :provideDownload="false"></ProcessWrapper>
            </dd>

            <dt v-if="backend.fileFormats && backend.fileFormats.input" @click="collapsed.inputFormats = !collapsed.inputFormats">
                <h4>{{collapsed.inputFormats ? '▸' : '▾'}} {{isSearchResult ? 'Matched' : 'All'}} input formats ({{supportedInputFormatsCount}})</h4>
            </dt>
            <dd v-if="backend.fileFormats && backend.fileFormats.input" v-show="!collapsed.inputFormats"> <!-- v-if to prevent errors when inputFormats is not present. If it is present: v-show to always render -> allow retrieval of item count (-> heading) from SupportedFileFormats component -->
                <FileFormats :formats="preparedBackend.fileFormats" version="1.0.0" :showInput="true" ref="supportedFileFormatsComponentInputs"></FileFormats>
            </dd>

            <dt v-if="backend.fileFormats && backend.fileFormats.output" @click="collapsed.outputFormats = !collapsed.outputFormats">
                <h4>{{collapsed.outputFormats ? '▸' : '▾'}} {{isSearchResult ? 'Matched' : 'All'}} output formats ({{supportedOutputFormatsCount}})</h4>
            </dt>
            <dd v-if="backend.fileFormats && backend.fileFormats.output" v-show="!collapsed.outputFormats"> <!-- v-if to prevent errors when outputFormats is not present. If it is present: v-show to always render -> allow retrieval of item count (-> heading) from SupportedFileFormats component -->
                <FileFormats :formats="preparedBackend.fileFormats" version="1.0.0" :showOutput="true" ref="supportedFileFormatsComponentOutputs"></FileFormats>
            </dd>

            <dt v-if="backend.serviceTypes" @click="collapsed.serviceTypes = !collapsed.serviceTypes">
                <h4>{{collapsed.serviceTypes ? '▸' : '▾'}} {{isSearchResult ? 'Matched' : 'All'}} service types ({{supportedServiceTypesCount}})</h4>
            </dt>
            <dd v-if="backend.serviceTypes" v-show="!collapsed.serviceTypes">
                <ServiceTypes :services="preparedBackend.serviceTypes" :version="preparedBackend.api_version" ref="supportedServiceTypesComponent"></ServiceTypes>
            </dd>

            <dt v-if="backend.udfRuntimes" @click="collapsed.udfRuntimes = !collapsed.udfRuntimes">
                <h4>{{collapsed.udfRuntimes ? '▸' : '▾'}} {{isSearchResult ? 'Matched' : 'All'}} UDF runtimes ({{supportedUdfRuntimesCount}})</h4>
            </dt>
            <dd v-if="backend.udfRuntimes" v-show="!collapsed.udfRuntimes">
                <UdfRuntimes :runtimes="preparedBackend.udfRuntimes" :version="preparedBackend.api_version" ref="supportedUdfRuntimesComponent"></UdfRuntimes>
            </dd>

            <dt v-if="backend.billing" @click="collapsed.billing = !collapsed.billing">
                <h4>{{collapsed.billing ? '▸' : '▾'}} Billing information</h4>
            </dt>
            <dd v-if="backend.billing && !collapsed.billing" class="billing">
                <BillingPlans :billing="backend.billing" :version="preparedBackend.api_version"></BillingPlans>
            </dd>
        </dl>

        </div>
    </div>
</template>

<script>
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';
import { SupportedFeatures, FileFormats, ServiceTypes, UdfRuntimes, BillingPlans, Description, LinkList } from '@openeo/vue-components';
import CollectionWrapper from './CollectionWrapper.vue';
import ProcessWrapper from './ProcessWrapper.vue';
import axios from 'axios';

export default {
	name: 'Backend',
	props: ['backendData', 'collapsible', 'initiallyCollapsed', 'isSearchResult', 'showVersion'],
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
            const sortCallbackName = (e1, e2) => e1.id.toLowerCase() > e2.id.toLowerCase();
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

    mounted: function() {
        if(this.$refs.supportedFeaturesComponent != undefined) {
            const supported = this.$refs.supportedFeaturesComponent.getSupportedFeatureCount();
            const total = this.$refs.supportedFeaturesComponent.getFeatureCount();
            this.supportedFunctionalitiesCount = '(' + supported + '/' + total + ')';
        }
        if(this.$refs.supportedFileFormatsComponentInputs != undefined) {
            this.supportedInputFormatsCount = this.$refs.supportedFileFormatsComponentInputs.getCount();
        }
        if(this.$refs.supportedFileFormatsComponentOutputs != undefined) {
            this.supportedOutputFormatsCount = this.$refs.supportedFileFormatsComponentOutputs.getCount();
        }
        if(this.$refs.supportedServiceTypesComponent != undefined) {
            this.supportedServiceTypesCount = this.$refs.supportedServiceTypesComponent.getCount();
        }
        if(this.$refs.supportedUdfRuntimesComponent != undefined) {
            this.supportedUdfRuntimesCount = this.$refs.supportedUdfRuntimesComponent.getCount();
        }
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
                inputFormats: true,
                outputFormats: true,
                serviceTypes: true,
                udfRuntimes: true,
                billing: true
            },
            supportedFunctionalitiesCount: '',
            supportedInputFormatsCount: undefined,
            supportedOutputFormatsCount: undefined,
            supportedServiceTypesCount: undefined,
            supportedUdfRuntimesCount: undefined
		};
    },

    methods: {
        async toggleCollections() {
            if(this.collapsed.collections && Array.isArray(this.preparedBackend.collections) && this.preparedBackend.collections.length > 0 && Object.keys(this.preparedBackend.collections[0]).length == 1) {
                document.body.classList.add('loading');
                let request = await axios.get('/api/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/collections');
                this.preparedBackend.collections = request.data;
                document.body.classList.remove('loading');
            }
            this.collapsed.collections = !this.collapsed.collections;
        },

        async toggleProcesses() {
            if(this.collapsed.processes && Array.isArray(this.preparedBackend.processes) && this.preparedBackend.processes.length > 0 && Object.keys(this.preparedBackend.processes[0]).length == 1) {
                document.body.classList.add('loading');
                let request = await axios.get('/api/backends/' + encodeURIComponent(encodeURIComponent(this.backend.backendUrl))+'/processes');
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

dd {
	margin-bottom: 10px;
}
dd > ul {
	padding-left: 15px;
}

div.warning {
    color: #d59800;  /* dark yellow */
    margin-top: 10px;
}
div.info {
    color: green;
    margin-top: 10px;
}
</style>

<style>
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
