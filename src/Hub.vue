<template>
	<div id="container">
		<header>
			<h1>openEO hub</h1>
		</header>

		<main>
			
			<section id="search">
				<h2>Search for collections across all backends</h2>

				<h3>Name</h3>
				<input v-model="collectionSearch.name" />
				<em>case-insensitive, regular expressions possible</em>

				<h3>Title</h3>
				<input v-model="collectionSearch.title" />
				<em>case-insensitive, regular expression possible</em>

				<h3>Description</h3>
				<input v-model="collectionSearch.description" />
				<em>case-insensitive, regular expression possible</em>

				<h3>Extent</h3>
				<h4>Spatial</h4>
				<em>Specify a bounding box in decimal WGS84 coordinates (e.g. 12.345) or click on the map below.</em>
				<BboxChooser :calledOnChange="setSpatialExtent"></BboxChooser>
				<h4>Temporal</h4>
				<em>From</em>
				<input v-model="collectionSearch.extent.temporal[0]" placeholder="YYYY-MM-DDThh:mm:ssZ"/>
				<em>until</em>
				<input v-model="collectionSearch.extent.temporal[1]" placeholder="YYYY-MM-DDThh:mm:ssZ"/>
				<em>(inclusive)</em>
				<p><em>Use <a href="https://www.ietf.org/rfc/rfc3339">RFC 3339</a> date-times (format: YYYY-MM-DDThh:mm:ssZ)</em></p>

				<h3>Actions</h3>
				<button @click="queryCollections()">Submit</button>


				<h2>Search for processes across all backends</h2>

				<h3>Name</h3>
				<input v-model="processSearch.name" />
				<em>case-insensitive, regular expression possible</em>

				<h3>Summary</h3>
				<input v-model="processSearch.summary" />
				<em>case-insensitive, regular expression possible</em>

				<h3>Description</h3>
				<input v-model="processSearch.description" />
				<em>case-insensitive, regular expression possible</em>

				<h3>Deprecation</h3>
				<input type="checkbox" v-model="processSearch.excludeDeprecated" id="excludeDeprecated">
				<label for="excludeDeprecated">Exclude processes that are deprecated</label>
				
				<h3>Parameters</h3>
				<h4>Names</h4>
				<textarea v-model="processSearch.parameterNames" placeholder="Specify parameter names (case-insensitive, regular expression possible), each on a new line"></textarea>
				<h4>Descriptions</h4>
				<textarea v-model="processSearch.parameterDescriptions" placeholder="Specify parameter description search terms (case-insensitive, regular expression possible), each on a new line"></textarea>

				<h3>Actions</h3>
				<button @click="queryProcesses()">Submit</button>

				
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
			</section>

			<section id="results">
				<h2>Results</h2>

				<ol>
					<li v-for="collection in matchedCollections" :key="collection.collection.backend+'/'+collection.collection.name">
						{{collection.collection.name}}
					</li>
				</ol>

				<ol>
					<li v-for="process in matchedProcesses" :key="process.process.backend+'/'+process.process.name">
						{{process.process.backend}} &ndash; {{process.process.name}}
					</li>
				</ol>

				<em v-if="matchedBackends.length == 0">empty</em>
				<output>
					<ol>
						<li v-for="backend in matchedBackends" :key="backend.backend">
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
									<CollectionPanel v-for="collection in backend.collections" :key="collection.name" :collection="collection"></CollectionPanel>
								</dd>
								
								<dt v-if="backend.processes"><h4>Processes</h4></dt>
								<dd v-if="backend.processes">
									<ProcessPanel v-for="process in backend.processes" :key="process.name" :process="process"></ProcessPanel>
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
import { ProcessPanel } from '@openeo/processes-docgen';
import { OPENEO_V0_3_1_ENDPOINTS } from './const.js'
import EndpointChooser from './components/EndpointChooser.vue';
import BboxChooser from './components/BboxChooser.vue';
import CollectionPanel from './components/CollectionPanel.vue';

export default {
	name: 'openeo-hub',
	components: {
		EndpointChooser,
		BboxChooser,
		CollectionPanel,
		ProcessPanel
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
			},
			matchedBackends: [],
			collectionSearch: {
				name: '',
				title: '',
				description: '',
				extent: {
					spatial: ['', '', '', ''],
					temporal: ['', '']
				}
			},
			matchedCollections: [],
			processSearch: {
				name: '',
				summary: '',
				description: '',
				excludeDeprecated: true,
				parameterNames: '',
				parameterDescriptions: ''
			},
			matchedProcesses: []
		};
	},
	methods: {
		setSelectedEndpoints(input) {
			this.backendSearch.endpoints = input;
		},

		setSpatialExtent(input) {
			console.log('called');
			this.collectionSearch.extent.spatial = input;
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
			axios.post('/backends/search', params)
				.then(response => {
					this.matchedBackends = response.data;
				})
				.catch(error => {
					console.log(error);
				});
		},

		queryCollections() {
			var params = {};
			
			// Build `params` object (can't use it directly because empty fields must be removed)
			Object.keys(this.collectionSearch).forEach(key => {
				if(this.collectionSearch[key] != '' && typeof this.collectionSearch[key] != 'object') {
					params[key] = this.collectionSearch[key];
				}
			});
			if(this.collectionSearch.extent.spatial[0] != '') {
				params.extent = {};
				params.extent.spatial = [];
				for(var i=0; i<=3; i++) {
					params.extent.spatial.push(parseFloat(this.collectionSearch.extent.spatial[i]));
				}
			}
			if(this.collectionSearch.extent.temporal[0] != '') {
				params.extent = params.extent || {};
				params.extent.temporal = [this.collectionSearch.extent.temporal[0], this.collectionSearch.extent.temporal[1]];
			}

			// actual query
			axios.post('/collections/search', params)
				.then(response => {
					this.matchedCollections = response.data;
				})
				.catch(error => {
					console.log(error);
				});
		},

		queryProcesses() {
			var params = {};
			
			// Build `params` object (can't use it directly because empty fields must be removed)
			Object.keys(this.processSearch).forEach(key => {
				if(this.processSearch[key] != '' || this.processSearch[key] != false) {
					if(key.indexOf('parameter') == 0) {
						params[key] = this.processSearch[key].split("\n");
					} else {
						params[key] = this.processSearch[key];
					}
				}
			});

			// actual query
			axios.post('/processes/search', params)
				.then(response => {
					this.matchedProcesses = response.data;
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
html, body, #app, #container {
	height: 100vh;
}
#container {
	display: flex;
	flex-direction: column;
}
header {
	padding: 10px;
}
main {
	display: flex;
	overflow: hidden;
}
section {
	flex: 1;
	overflow-y: auto;
	padding: 10px;
}
section:first-child {
	margin-right: 10px;
}
section:last-child {
	margin-left: 10px;
}
footer {
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
	width: 90%;
	overflow-y: scroll;
	padding: 5px;
	border: 1px solid #cecbc8;
}
#search textarea {
	width: 90%;
	height: 100px;
	padding: 5px;
}
#search input + em,
#search em + input {
	margin-left: 5px;
}
#search p {
	margin-top: 0;
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
#results .processPanel {
	margin-top: 0;
	margin-bottom: 0;
}
#results .processPanel h2,
#results .processPanel h3,
#results .collectionPanel h2,
#results .collectionPanel h3 {
	font-size: 100%;
	margin-top: 10px;
}
</style>
