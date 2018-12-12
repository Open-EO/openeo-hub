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
                    <li v-for="endpoint in backend.endpoints" :key="endpoint">{{endpoint}}</li>
                </ul>
            </dd>

            <dt v-if="backend.collections" @click="collapsed.collections = !collapsed.collections">
                <h4>{{collapsed.collections ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} collections ({{backend.collections.length}})</h4>
            </dt>
            <dd v-if="backend.collections && !collapsed.collections">
                <Collection v-for="collection in backend.collections" :key="collection.name" :collection="collection" initiallyCollapsed="true"></Collection>
            </dd>
            
            <dt v-if="backend.processes" @click="collapsed.processes = !collapsed.processes">
                <h4>{{collapsed.processes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} processes ({{backend.processes.length}})</h4>
            </dt>
            <dd v-if="backend.processes && !collapsed.processes">
                <Process v-for="process in backend.processes" :key="process.name || process.id" :process="convertProcessToLatestSpec(process)" :baseConfig="{processesInitiallyCollapsed:true}"></Process>
            </dd>

            <dt v-if="backend.outputFormats" @click="collapsed.outputFormats = !collapsed.outputFormats">
                <h4>{{collapsed.outputFormats ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} output formats ({{Object.keys(backend.outputFormats).length}})</h4>
            </dt>
            <dd v-if="backend.outputFormats && !collapsed.outputFormats">
                <ul>
                    <li v-for="of in Object.keys(backend.outputFormats)" :key="of">{{of}}</li>
                </ul>
            </dd>

            <dt v-if="backend.serviceTypes" @click="collapsed.serviceTypes = !collapsed.serviceTypes">
                <h4>{{collapsed.serviceTypes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} service types ({{Object.keys(backend.serviceTypes).length}})</h4>
            </dt>
            <dd v-if="backend.serviceTypes && !collapsed.serviceTypes">
                <ul>
                    <li v-for="st in Object.keys(backend.serviceTypes)" :key="st">{{st}}</li>
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
</style>
