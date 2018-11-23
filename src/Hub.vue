<template>
	<div id="container">
		<h1>openEO hub</h1>

		<h2>Search</h2>

		<h3>Version</h3>
		<div>
			<input type="radio" value="any"   v-model="selectedVersion" id="vany"><label for="vany">any</label>
			<input type="radio" value="0.3.0" v-model="selectedVersion" id="v030"><label for="v030">0.3.0</label>
			<input type="radio" value="0.3.1" v-model="selectedVersion" id="v031"><label for="v031">0.3.1</label>
		</div>

		<h3>Endpoints</h3>
		<EndpointChooser :endpoints="allEndpoints" :calledOnChange="setSelectedEndpoints"></EndpointChooser>

		<h3>Collections</h3>
		<textarea v-model="specifiedCollections" placeholder="Specify collection identifiers, each on a new line"></textarea>

		<h3>Processes</h3>
		<textarea v-model="specifiedProcesses" placeholder="Specify process identifiers, each on a new line"></textarea>

		<h3>Process Graph</h3>
		<textarea v-model="specifiedProcessGraph" placeholder="Paste an openEO process graph"></textarea>

		<h3>Actions</h3>
		<button @click="queryBackends()">Submit</button>

		<h2>Result</h2>
		<em v-if="matchedBackends.length == 0">empty</em>
		<output>
			<ul>
				<li v-for="backend in matchedBackends" :key="backend">{{backend}}</li>
			</ul>
		</output>
	</div>
</template>

<script>
import Vue from 'vue';
import axios from 'axios';
import { OPENEO_V0_3_1_ENDPOINTS } from './const.js'
import EndpointChooser from './components/EndpointChooser.vue';

export default {
	name: 'openeo-hub',
	components: {
		EndpointChooser
	},
	data() {
		return {
			selectedVersion: 'any',
			// sort alphabetically by endpoint path (i.e. delete HTTP method (always uppercased) for sorting)
			allEndpoints: OPENEO_V0_3_1_ENDPOINTS.sort((e1, e2) => e1.replace(/[A-Z]/g, '') > e2.replace(/[A-Z]/g, '')),
			selectedEndpoints: [],
			specifiedCollections: '',
			specifiedProcesses: '',
			specifiedProcessGraph: '',
			matchedBackends: []
		};
	},
	methods: {
		setSelectedEndpoints(input) {
			this.selectedEndpoints = input;
		},
		queryBackends() {
			const params = {
				version:             (this.selectedVersion == 'any' ? undefined : this.selectedVersion),
				endpoints:      (this.selectedEndpoints.length == 0 ? undefined : this.selectedEndpoints),
				collections: (this.specifiedCollections.length == 0 ? undefined : this.specifiedCollections.split("\n")),
				processes:     (this.specifiedProcesses.length == 0 ? undefined : this.specifiedProcesses.split("\n")),
				processGraph:     (this.specifiedProcessGraph == '' ? undefined : JSON.parse(this.specifiedProcessGraph))
			}
			axios.post('/backends/search', params)
				.then(response => {
					this.matchedBackends = response.data;
				})
				.error(error => {
					alert(error);
				});
		}
	}
}
</script>

<style>
html, body, #app, #container {
	height: 100%;
}
body {
	margin: 0;
	font-family: sans-serif;
	font-size: 90%;
}
h1, h2, h3 {
	margin-bottom: 0;
}

a {
	color: #2F649A;
	text-decoration: none;
	cursor: pointer;
}
a:hover {
	color: black;
}

button {
	margin: 1px;
}
ul, ol {
	margin-bottom: 0;
	margin-top: 0;
	padding-bottom: 0;
	padding-top: 0;
}

#endpointchooser {
	/*column-count: 4;*/
	height: 100px;
	width: 400px;
	overflow-y: scroll;
}
textarea {
	width: 50vw;
	min-width: 300px;
	height: 100px;
}
</style>
