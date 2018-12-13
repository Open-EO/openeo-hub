<template>
	<div class="backend">
        <h3>{{backend.backend}}</h3>
        <dl>
            <dt><h4>Version</h4></dt>
            <dd>{{backend.version}}</dd>

            <dt v-if="backend.endpoints" @click="collapsed.endpoints = !collapsed.endpoints">
                <h4>{{collapsed.endpoints ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} endpoints ({{backend.endpoints.length}})</h4>
            </dt>
            <dd v-if="backend.endpoints && !collapsed.endpoints">
                <ul>
                    <li v-for="endpoint in preparedBackend.endpoints" :key="endpoint">{{endpoint}}</li>
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
                <Process v-for="process in backend.processes" :key="process.name || process.id" :process="convertProcessToLatestSpec(process)" :baseConfig="{processesInitiallyCollapsed:true}"></Process>
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
        </dl>
        <div class="retrieved">
            <DataRetrievedNotice :timestamp="backend.retrieved"></DataRetrievedNotice>
        </div>
    </div>
</template>

<script>
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import { Process, Utils as DocGenUtils } from '@openeo/processes-docgen';
import Collection from './Collection.vue';

export default {
	name: 'Backend',
	props: ['backend', 'initiallyCollapsed', 'isSearchResult'],
	components: {
        DataRetrievedNotice,
        Collection,
        Process
    },
    computed: {
        preparedBackend() {
            if(this.isSearchResult) {
                // don't touch search result because order may be important
                return this.backend;
            } else {
                // when we get a long list for the discovery section having it sorted alphabetically is very handy
                var original = this.backend;
                // endpoints are not sorted because the initial search order is already good
                original.collections = original.collections.sort((c1, c2) => c1.name.toLowerCase() > c2.name.toLowerCase());
                original.processes = original.processes.sort((p1, p2) => p1.name.toLowerCase() > p2.name.toLowerCase());
                original.outputFormats = Object.keys(original.outputFormats).sort((of1, of2) => of1.toLowerCase() > of2.toLowerCase());
                original.serviceTypes = Object.keys(original.serviceTypes).sort((st1, st2) => st1.toLowerCase() > st2.toLowerCase());
                return original;
            }
        }
    },
	data() {
		return {
			collapsed: {
                root: this.initiallyCollapsed || false,
                endpoints: true,
                collections: true,
                processes: true,
                outputFormats: true,
                serviceTypes: true
            }
		};
    },
    methods: {
        convertProcessToLatestSpec(proc) {
            return DocGenUtils.convertProcessToLatestSpec(proc);
        }
    }
}
</script>

<style scoped>
h4 {
    cursor: pointer;
}
ul.output-formats,
ul.service-types {
    column-width: 10em;
}
</style>
