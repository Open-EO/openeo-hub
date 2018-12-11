<template>
	<div class="backendPanel">
        <h3>{{backend.backend}}</h3>
        <dl>
            <dt><h4>Version</h4></dt>
            <dd>{{backend.version}}</dd>

            <dt v-if="backend.endpoints"><h4>Matched endpoints ({{backend.endpoints.length}})</h4></dt>
            <dd v-if="backend.endpoints">
                <ul>
                    <li v-for="endpoint in backend.endpoints" :key="endpoint">{{endpoint}}</li>
                </ul>
            </dd>

            <dt v-if="backend.collections"><h4>Matched collections ({{backend.collections.length}})</h4></dt>
            <dd v-if="backend.collections">
                <Collection v-for="collection in backend.collections" :key="collection.name" :collection="collection" initiallyCollapsed="true"></Collection>
            </dd>
            
            <dt v-if="backend.processes"><h4>Matched processes ({{backend.processes.length}})</h4></dt>
            <dd v-if="backend.processes">
                <Process v-for="process in backend.processes" :key="process.name || process.id" :process="convertProcessToLatestSpec(process)" :baseConfig="{processesInitiallyCollapsed:true}"></Process>
            </dd>

            <dt v-if="backend.outputFormats"><h4>Matched output formats ({{Object.keys(backend.outputFormats).length}})</h4></dt>
            <dd v-if="backend.outputFormats">
                <ul>
                    <li v-for="of in Object.keys(backend.outputFormats)" :key="of">{{of}}</li>
                </ul>
            </dd>

            <dt v-if="backend.serviceTypes"><h4>Matched service types ({{Object.keys(backend.serviceTypes).length}})</h4></dt>
            <dd v-if="backend.serviceTypes">
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
	props: ['backend', 'initiallyCollapsed'],
	components: {
        DataRetrievedNotice,
        Collection,
        Process
	},
	data() {
		return {
			collapsed: this.initiallyCollapsed || false
		};
    },
    methods: {
        convertProcessToLatestSpec(proc) {
            return DocGenUtils.convertProcessToLatestSpec(proc);
        }
    }
}
</script>

<style>
</style>
