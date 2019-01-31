<template>
	<div class="backend">
        <a :href="webEditorUrl" target="_blank" class="open-in-web-editor">
            <button>Open in openEO Web Editor</button>
        </a>
        
        <h3>
            {{backend.title}}
            <template v-if="backend.version"> | v{{backend.version}}</template>
        </h3>
        <small><code>{{backend.backend}}</code></small>
        
        <UnsuccessfulCrawlNotice :unsuccessfulCrawls="backend.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>

        <dl>
            <dt v-if="functionalities" @click="collapsed.functionalities = !collapsed.functionalities">
                <h4>{{collapsed.functionalities ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'Supported'}} functionalities ({{supportedFunctionalitiesCount}})</h4>
            </dt>
            <dd v-if="functionalities && !collapsed.functionalities">
                <ul class="functionalities">
                    <li v-for="(yesno, functionality) in functionalities" :key="functionality">{{yesno ? '✔️' : '❌'}} {{functionality}}</li>
                </ul>
            </dd>

            <dt v-if="backend.collections" @click="collapsed.collections = !collapsed.collections">
                <h4>{{collapsed.collections ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} collections ({{backend.collections.length}})</h4>
            </dt>
            <dd v-if="backend.collections && !collapsed.collections">
                <Collection v-for="collection in preparedBackend.collections" :key="collection.name" :collection="collection" initiallyCollapsed="true"></Collection>
            </dd>
            
            <dt v-if="backend.processes" @click="collapsed.processes = !collapsed.processes">
                <h4>{{collapsed.processes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} processes ({{backend.processes.length}})</h4>
            </dt>
            <dd v-if="preparedBackend.processes && !collapsed.processes">
                <Process v-for="process in backend.processes" :key="process.name || process.id" :process="process" :baseConfig="{processesInitiallyCollapsed:true}">
                    <template slot="process-after-summary">
                        <UnsuccessfulCrawlNotice :unsuccessfulCrawls="process.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
                    </template>
                    <template slot="process-after-details">
                        <DataRetrievedNotice :timestamp="process.retrieved"></DataRetrievedNotice>
                    </template>
                </Process>
            </dd>

            <dt v-if="backend.outputFormats" @click="collapsed.outputFormats = !collapsed.outputFormats">
                <h4>{{collapsed.outputFormats ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} output formats ({{Object.keys(backend.outputFormats).length}})</h4>
            </dt>
            <dd v-if="backend.outputFormats && !collapsed.outputFormats">
                <ul class="output-formats">
                    <li v-for="of in preparedBackend.outputFormats" :key="of">{{of}}</li>
                </ul>
            </dd>

            <dt v-if="backend.serviceTypes" @click="collapsed.serviceTypes = !collapsed.serviceTypes">
                <h4>{{collapsed.serviceTypes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} service types ({{Object.keys(backend.serviceTypes).length}})</h4>
            </dt>
            <dd v-if="backend.serviceTypes && !collapsed.serviceTypes">
                <ul class="service-types">
                    <li v-for="st in preparedBackend.serviceTypes" :key="st">{{st}}</li>
                </ul>
            </dd>

            <dt v-if="backend.billing" @click="collapsed.billing = !collapsed.billing">
                <h4>{{collapsed.billing ? '▶' : '▼'}} Billing information</h4>
            </dt>
            <dd v-if="backend.billing && !collapsed.billing" class="billing">
                <h5>Currency</h5>
                {{preparedBackend.billing.currency}}
                <h5 v-if="backend.billing.plans">Available plans ({{backend.billing.plans.length}})</h5>
                <ul v-if="backend.billing.plans" class="plans">
                    <li v-for="p in preparedBackend.billing.plans" :key="p.name" class="plan">
                        <h2>{{p.name}} <template v-if="preparedBackend.billing.default_plan == p.name">(default)</template></h2>
                        {{p.description}}
                        <a v-if="p.url" :href="p.url">More information</a>
                    </li>
                </ul>
            </dd>
        </dl>
        <DataRetrievedNotice :timestamp="backend.retrieved"></DataRetrievedNotice>
    </div>
</template>

<script>
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';
import { Process, Utils as DocGenUtils } from '@openeo/processes-docgen';
import Collection from './Collection.vue';
import { OPENEO_V0_3_1_FUNCTIONALITIES } from './../const.js'

export default {
	name: 'Backend',
	props: ['backend', 'initiallyCollapsed', 'isSearchResult'],
	components: {
        DataRetrievedNotice,
        UnsuccessfulCrawlNotice,
        Collection,
        Process
    },
    computed: {
        preparedBackend() {
            var original = this.backend;

            // normalize `processes` so the Process component can work with it
            if(Array.isArray(original.processes)) {
                original.processes = original.processes.map(DocGenUtils.normalizeProcess.bind(DocGenUtils));
            }

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

            return original;
        },

        functionalities() {
            if(!this.backend.endpoints) {
                if(this.isSearchResult) {
                    return undefined;
                } else {
                    this.backend.endpoints = [];
                }
            }

            let yesno = Object.assign({}, OPENEO_V0_3_1_FUNCTIONALITIES);

            Object.keys(yesno).forEach(key =>  // for each functionality
                yesno[key] = yesno[key].every(endpoint =>  // to be labelled "supported", ALL endpoints of the functionality must be supported
                    this.backend.endpoints.some(e =>  // the functionality's endpoint must be found in the returned endpoints array
                        e.match(new RegExp(endpoint.replace(/{[^}]+}/g, '{[^}]+}')))  // allow arbitrary parameter names (aka don't care about content in curly brackets)
                    )
                )
            );

            if(this.isSearchResult) {
                // "filter" out all false values (if it was a search, we don't care about we *didn't* find)
                Object.keys(yesno).forEach(key => {
                    if(!yesno[key]) {
                        delete yesno[key];
                    }
                });
            }

            return yesno;

            // solution that returns array of supported functionalities (but doesn't include unsupported ones and doesn't map to true/false)
            /*
            return Object.keys(OPENEO_V0_3_1_FUNCTIONALITIES).filter(func =>  // filter functionality names
                OPENEO_V0_3_1_FUNCTIONALITIES[func].every(endpoint =>  // rest as above
                    this.backend.endpoints.some(e =>
                        e.match(new RegExp(endpoint.replace(/{[^}]+}/g, '{[^}]+}')))
                    )
                )
            );
            */
        },

        supportedFunctionalitiesCount() {
            const supported = Object.values(this.functionalities).reduce((sum, currentValue) => sum + (currentValue == true ? 1 : 0), 0);
            const total = Object.keys(OPENEO_V0_3_1_FUNCTIONALITIES).length;
            if(this.isSearchResult) {
                return supported;
            } else {
                return supported + '/' + total;
            }
        },

        webEditorUrl() {
            var protocol = 'https:';
            if (this.backend.backend.toLowerCase().substr(0,5) === 'http:') {
                protocol = 'http:';
            }
            return protocol + '//editor.openeo.org/?server=' + encodeURIComponent(this.backend.backend)
        }
    },
	data() {
		return {
			collapsed: {
                root: this.initiallyCollapsed || false,
                functionalities: true,
                collections: true,
                processes: true,
                outputFormats: true,
                serviceTypes: true,
                billing: true
            }
		};
    }
}
</script>

<style scoped>
h4 {
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
</style>
