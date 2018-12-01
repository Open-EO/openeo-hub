<template>
    <div>
        <h2>Search for backends</h2>

        <h3>openEO API Version</h3>
        <div>
            <input type="radio" value="any"   v-model="backendSearch.version" id="vany"><label for="vany">any</label>
            <input type="radio" value="0.3.0" v-model="backendSearch.version" id="v030"><label for="v030">0.3.0</label>
            <input type="radio" value="0.3.1" v-model="backendSearch.version" id="v031"><label for="v031">0.3.1</label>
        </div>

        <h3>Endpoints</h3>
        <EndpointChooser :endpoints="allEndpoints" :calledOnChange="setSelectedEndpoints"></EndpointChooser>
        <p><em>Tick all endpoints that the backend must support</em></p>

        <h3>Collections</h3>
        <textarea v-model="backendSearch.collections" placeholder="Specify collection identifiers, each on a new line"></textarea>
        <p><em>(case-insensitive, regular expression possible)</em></p>

        <h3>Processes</h3>
        <textarea v-model="backendSearch.processes" placeholder="Specify process identifiers, each on a new line"></textarea>
        <p><em>(case-insensitive, regular expression possible)</em></p>

        <h3>Process Graph</h3>
        <textarea v-model="backendSearch.processGraph" placeholder="Paste an openEO process graph"></textarea>
        <p><em>A backend is considered to support a process graph if it offers all collections and processes used in that process graph. No further checks are carried out.</em></p>

        <h3>Output formats</h3>
        <textarea v-model="backendSearch.outputFormats" placeholder="Specify output formats, each on a new line"></textarea>
        <p><em>Exact matching (i.e. case-sensitive and no matching of subterms)</em></p>

        <h3>Service Types</h3>
        <textarea v-model="backendSearch.serviceTypes" placeholder="Specify service types, each on a new line"></textarea>
        <p><em>Exact matching (i.e. case-sensitive and no matching of subterms)</em></p>

        <h3>Billing</h3>
        <input type="checkbox" v-model="backendSearch.excludePaidOnly" id="excludePaidOnly"><label for="excludePaidOnly">Exclude backends without a free plan</label>

        <h3>Actions</h3>
        <button @click="queryBackends()">Submit</button>
    </div>
</template>

<script>
import { OPENEO_V0_3_1_ENDPOINTS } from './../const.js'
import EndpointChooser from './EndpointChooser.vue';

export default {
	name: 'BackendSearch',
	components: {
		EndpointChooser
	},
	data() {
		return {
			// sort alphabetically by endpoint path (i.e. delete HTTP method (always uppercased) for sorting)
			allEndpoints: OPENEO_V0_3_1_ENDPOINTS.sort((e1, e2) => e1.replace(/[A-Z]/g, '') > e2.replace(/[A-Z]/g, '')),
			backendSearch: {
				version: 'any',
				endpoints: [],
				collections: '',
				processes: '',
				processGraph: '',
				outputFormats: '',
				serviceTypes: '',
				excludePaidOnly: false
			}
		};
	},
	methods: {
		setSelectedEndpoints(input) {
			this.backendSearch.endpoints = input;
		},

		queryBackends() {
			const params = {
				version:          (this.backendSearch.version == 'any' ? undefined : this.backendSearch.version),
				endpoints:  (this.backendSearch.endpoints.length == 0  ? undefined : this.backendSearch.endpoints),
				collections:     (this.backendSearch.collections == '' ? undefined : this.backendSearch.collections.split("\n")),
				processes:         (this.backendSearch.processes == '' ? undefined : this.backendSearch.processes.split("\n")),
				processGraph:   (this.backendSearch.processGraph == '' ? undefined : JSON.parse(this.backendSearch.processGraph)),
				outputFormats: (this.backendSearch.outputFormats == '' ? undefined : this.backendSearch.outputFormats.split("\n")),
				serviceTypes:   (this.backendSearch.serviceTypes == '' ? undefined : this.backendSearch.serviceTypes.split("\n")),
				excludePaidOnly:  (!this.backendSearch.excludePaidOnly ? undefined : true)
            }
            this.$emit('search-backends', params);
		}
	}
}
</script>

<style>
</style>
