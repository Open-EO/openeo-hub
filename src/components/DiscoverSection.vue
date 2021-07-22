<template>
    <section id="discover">
		<section id="discover-list">
			<p>This is a list of all known openEO providers and their services:</p>
			<ul class="backendlist" ref="backendlist">
				<li v-for="group in allBackendGroups" :key="group.name">
					<BackendGroup :groupName="group.name" :backends="group.backends" :filters="filters"></BackendGroup>
				</li>
			</ul>
			<em v-if="noFilterMatches">No service matches your search criteria.</em>
		</section>

		<section id="discover-filters">
			<h3>Filters</h3>

			<h4>openEO API versions</h4>
			<div>
				<input type="checkbox" v-model="filters.apiVersions" value="0.4" id="v0dot4"><label for="v0dot4">0.4.x</label>
				<input type="checkbox" v-model="filters.apiVersions" value="1.0" id="v1dot0"><label for="v1dot0">1.0.x</label>
			</div>

			<h4>Functionalities</h4>
			<EndpointChooser class="compact" :categorizedEndpoints="allEndpointsCategorized" @input="filters.endpoints = $event"></EndpointChooser>

			<h4>Collections</h4>
			<Multiselect
				v-model="filters.collections" :options="optionCollections" trackBy="id" label="id"
				placeholder="Select from list, or type to search through IDs and titles"
				:internalSearch="false" @search-change="searchCollections" :option-height="66" :clearOnSelect="false"
				:taggable="true" @tag="addCollectionSearchTerm" @remove="potentiallyRemoveCollectionSearchTerm"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props" style="width: 100%">
					<strong>{{props.option.id || '"'+props.search+'"'}}</strong>
					<p style="margin-bottom:0">{{props.option.title || "&nbsp;"}}</p>
				</template>	
			</Multiselect>

			<h4>Processes</h4>
			<Multiselect
				v-model="filters.processes" :options="optionProcesses" trackBy="id" label="id"
				placeholder="Select from list, or type to search through IDs and summaries"
				:internalSearch="false" @search-change="searchProcesses" :option-height="66" :clearOnSelect="false"
				:taggable="true" @tag="addProcessSearchTerm" @remove="potentiallyRemoveProcessSearchTerm"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props" style="width: 100%">
					<strong>{{props.option.id || '"'+props.search+'"'}}</strong>
					<span v-if="props.option.count">&nbsp;({{props.option.count}})</span>
					<p style="margin-bottom:0">{{props.option.summary || "&nbsp;"}}</p>
				</template>	
			</Multiselect>

			<h4>Input formats</h4>
			<Multiselect
			    v-model="filters.inputFormats" :options="allInputFormats" trackBy="format" label="format"
				placeholder="Select from list, or type to search"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props">
					{{props.option.format}} <span v-if="props.option.count">({{props.option.count}})</span>
				</template>
			</Multiselect>
			
			<h4>Output formats</h4>
			<Multiselect
			    v-model="filters.outputFormats" :options="allOutputFormats" trackBy="format" label="format"
				placeholder="Select from list, or type to search"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props">
					{{props.option.format}} <span v-if="props.option.count">({{props.option.count}})</span>
				</template>
			</Multiselect>

			<h4>Service types</h4>
			<Multiselect
			    v-model="filters.serviceTypes" :options="allServiceTypes" trackBy="service" label="service"
				placeholder="Select from list, or type to search"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props">
					{{props.option.service}} <span v-if="props.option.count">({{props.option.count}})</span>
				</template>
			</Multiselect>

			<h4>UDF runtimes</h4>
			<Multiselect
			    v-model="filters.udfRuntimes" :options="allUdfRuntimes" trackBy="runtime" label="runtime"
				placeholder="Select from list, or type to search"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props">
					{{props.option.runtime}} <span v-if="props.option.count">({{props.option.count}})</span>
				</template>
			</Multiselect>
		
		    <h4>Billing</h4>
			<div>
				<input type="checkbox" v-model="filters.excludeIfNoFreePlan" id="excludeIfNoFreePlan">
				<label for="excludeIfNoFreePlan">Must have a free plan</label>
			</div>

			<h4>User-defined process</h4>
			<div>
				<textarea v-model="filters.processGraph"></textarea>
			</div>
		</section>
    </section>
</template>

<script>
import axios from 'axios';
import BackendGroup from './BackendGroup.vue';
import Multiselect from 'vue-multiselect';
var FeatureList = require('@openeo/vue-components/featurelist.js');
import EndpointChooser from './EndpointChooser.vue';

export default {
	name: 'discover-section',
	components: {
		BackendGroup,
		EndpointChooser,
		Multiselect
	},
	data() {
		return {
			allBackendGroups: [],
			allCollections: [],
			searchedCollections: [],
			taggedCollections: [],
			allProcesses: [],
			searchedProcesses: [],
			taggedProcesses: [],
			allEndpointsCategorized: FeatureList.features,
			allInputFormats: [],
			allOutputFormats: [],
			allServiceTypes: [],
			allUdfRuntimes: [],
			filters: {
				apiVersions: [],
				collections: [],
				excludeIfNoFreePlan: false,
				endpoints: [],
				inputFormats: [],
				outputFormats: [],
				processes: [],
				processGraph: '',
				serviceTypes: [],
				udfRuntimes: []
			},
			noFilterMatches: false
		};
	},
	computed: {
		optionCollections: function() {
			return this.searchedCollections.concat(this.taggedCollections);
		},
		optionProcesses: function() {
			return this.searchedProcesses.concat(this.taggedProcesses);
		}
	},
	watch: {
		filters: {
			deep: true,  // to watch all changes within the object
			handler: function(newVal, oldVal) {
				this.$nextTick(() => {  // because DOM might not be updated yet
				    // for every item of the list
					this.noFilterMatches = Array.from(this.$refs.backendlist.children).every(
						// test whether its BackendGroup component has been entirely hidden by its v-show
						li => li.firstChild.style.display == 'none'
					)
				})
			}
		}
	},
	mounted() {
		axios.get('/api/backends?details=grouped')
			.then(response => {
				var result = response.data;
				result.sort((a, b) => {
					return a.name.toLowerCase().localeCompare(b.name.toLowerCase());  // ascending by name
				}).map(e => e.backends.sort((a, b) => {
					var aVersion = (a.api_version || "0.0.0").split('.');
					var bVersion = (b.api_version || "0.0.0").split('.');
					if (aVersion[0] > bVersion[0]) {  // descending by version, first look at major part
						return -1;
					}
					else if (aVersion[0] < bVersion[0]) {
						return 1;
					}
					else if (aVersion[1] > bVersion[1]) {  // if equal: by minor part
						return -1;
					}
					else if (aVersion[1] < bVersion[1]) {
						return 1;
					}
					else if (aVersion[2] > bVersion[2]) {  // if still equal: by patch part
						return -1;
					}
					else {
						return 1;
					}
				}));
				this.allBackendGroups = result;
			})
			.catch(error => {
				console.log(error);
			});
		
		axios.get('/api/collections')
			.then(response => { this.allCollections = response.data; this.searchCollections(""); })
			.catch(error => console.log(error));

		axios.get('/api/processes')
			.then(response => { this.allProcesses = response.data; this.searchProcesses(""); })
			.catch(error => console.log(error));
		
		axios.get('/api/input_formats')
			.then(response => this.allInputFormats = response.data)
			.catch(error => console.log(error));
		
		axios.get('/api/output_formats')
			.then(response => this.allOutputFormats = response.data)
			.catch(error => console.log(error));

		axios.get('/api/service_types')
			.then(response => this.allServiceTypes = response.data)
			.catch(error => console.log(error));

		axios.get('/api/udf_runtimes')
			.then(response => this.allUdfRuntimes = response.data)
			.catch(error => console.log(error));
	},
	methods: {
		searchCollections(query) {
			const queries = query.trim().toLowerCase().split(' ');
			this.searchedCollections = this.allCollections.filter(c => {
				const textToSearch = (c.id + (c.title ? ' ' + c.title : '')).toLowerCase();
				return queries.every(q => textToSearch.indexOf(q) != -1);
			});
		},

		addCollectionSearchTerm(searchterm, id) {
			const newItem = {
				id: '"' + searchterm + '"',
				isSearchterm: true,  // using "isTag" as the name (for some strange reason...) breaks the labeling of the tags!
				matches: this.searchedCollections.map(c => c.id)
			};
			// add to BOTH value array and options array
			this.filters.collections.push(newItem);
			this.taggedCollections.push(newItem);
		},

		potentiallyRemoveCollectionSearchTerm(removedOption) {
			if(removedOption.isSearchterm) {
				this.taggedCollections.splice(this.taggedCollections.findIndex(e => e.id == removedOption.id), 1);
				// removing from value array (this.filters.collections) works automatically
			}
		},

		searchProcesses(query) {
			const queries = query.trim().toLowerCase().split(' ');
			this.searchedProcesses = this.allProcesses.filter(p => {
				const textToSearch = (p.id + (p.allSummaries ? ' ' + p.allSummaries.join(' / ') : '')).toLowerCase();
				return queries.every(q => textToSearch.indexOf(q) != -1);
			});
		},

		addProcessSearchTerm(searchterm, id) {
			const newItem = {
				id: '"' + searchterm + '"',
				isSearchterm: true,  // using "isTag" as the name (for some strange reason...) breaks the labeling of the tags!
				matches: this.searchedProcesses.map(p => p.id)
			};
			// add to BOTH value array and options array
			this.filters.processes.push(newItem);
			this.taggedProcesses.push(newItem);
		},

		potentiallyRemoveProcessSearchTerm(removedOption) {
			if(removedOption.isSearchterm) {
				this.taggedProcesses.splice(this.taggedProcesses.findIndex(e => e.id == removedOption.id), 1);
				// removing from value array (this.filters.processes) works automatically
			}
		}
	}
}
</script>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

<style scoped>
ul.backendlist {
	padding: 0;
}

textarea {
    width: 95%;
    height: 100px;
}
</style>
