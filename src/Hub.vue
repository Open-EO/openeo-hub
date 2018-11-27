<template>
	<div id="container">
		<header>
			<h1>openEO hub</h1>
		</header>

		<main>
			
			<section id="search">
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
			</section>

			<section id="results">
				<h2>Results</h2>
				<em v-if="matchedBackends.length == 0">empty</em>
				<output>
					<ol>
						<li v-for="backend in matchedBackends" :key="backend">
							<h3>{{backend.backend}}</h3>
							<dl>
								<dt><h4>Version</h4></dt>
								<dd>{{backend.version}}</dd>

								<dt v-if="backend.endpoints"><h4>Endpoints</h4></dt>
								<dd v-if="backend.endpoints">
									<ul>
										<li v-for="endpoint in backend.endpoints" :key="endpoint">{{endpoint}}</li>
									</ul>
								</dd>

								<dt v-if="backend.collections"><h4>Collections</h4></dt>
								<dd v-if="backend.collections">
									<ul>
										<li v-for="collection in backend.collections" :key="collection.name">
											<h5>{{collection.name}}</h5>
											{{collection}}
										</li>
									</ul>
								</dd>
								
								<dt v-if="backend.processes"><h4>Processes</h4></dt>
								<dd v-if="backend.processes">
									<DocGenProcesses :processes="backend.processes"></DocGenProcesses>
								</dd>
							</dl>
						</li>
					</ol>
				</output>
			</section>

		</main>

		<footer>
			This is <strong>openEO hub</strong>, a discovery and exchange platform for the <a href="http://openeo.org/">openEO</a> community.
		</footer>
	</div>
</template>

<script>
import Vue from 'vue';
import axios from 'axios';
import { DocGenProcesses } from '@openeo/processes-docgen';
import { OPENEO_V0_3_1_ENDPOINTS } from './const.js'
import EndpointChooser from './components/EndpointChooser.vue';

export default {
	name: 'openeo-hub',
	components: {
		EndpointChooser,
		DocGenProcesses
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
				.catch(error => {
					console.log(error);
				});
		}
	}
}
</script>

<style>
/* normalize browser standards */
body {
	margin: 0;
	font-family: sans-serif;
}
h1, h2, h3, h4, h5, h6 {
	margin: 0;
}
ul, ol {
	margin-bottom: 0;
	margin-top: 0;
	padding-bottom: 0;
	padding-top: 0;
}

/* general layout */
html, body, #app {
	height: 100vh;
}
#container {
	padding: 10px;
}
main {
	display: flex;
}
section {
	flex: 1;
}
section:first-child {
	margin-right: 10px;
}
section:last-child {
	margin-left: 10px;
}
footer {
	margin-top: 75px;
	border-top: 1px dotted #cecbc8;
	padding: 10px;
	text-align: center;
}

/* own standards */
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
label {
	padding-left: 3px;
	margin-right: 10px;
}
input[type='radio'],
input[type='checkbox'] {
	vertical-align: bottom;
}

/* search section */
#search h2,
#search h3 {
	margin-top: 10px;
}
#endpointchooser {
	/*column-count: 4;*/
	height: 100px;
	width: 100%;
	overflow-y: scroll;
	padding: 5px;
	border: 1px solid #cecbc8;
}
#search textarea {
	width: 100%;
	height: 100px;
	padding: 5px;
}

/* results section */
#results h2,
#results h3 {
	margin-bottom: 10px;
}
#results h3,
#results h4,
#results h5 {
	font-size: 100%;
}
#results h4,
#results h5 {
	font-weight: normal;
}
#results em {
	margin-left: 20px;
}
#results output > ol > li { /* with "direct child" selectors so that it doesn't affect `li`s of other lists further down */
	margin-bottom: 20px;
}
#results dd {
	margin-bottom: 10px;
}
#results dd > ul {
	padding-left: 15px;
}
</style>
