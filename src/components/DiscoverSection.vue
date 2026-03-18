<template>
    <section id="discover">
		<section id="discover-list">
			<p>This is a list of all known openEO providers and their services:</p>
			<ul class="backendlist">
				<li v-for="group in allBackendGroups" :key="group.name">
					<BackendGroup :groupName="group.name" :backends="group.backends" :filters="filters" ref="backendGroupComponents"></BackendGroup>
				</li>
			</ul>
			<em v-if="noFilterMatches">No service matches your search criteria.</em>
		</section>

		<section id="discover-filters">
			<h3>Filters</h3>

			<h4>Functionalities</h4>
			<EndpointChooser class="compact" :categorizedEndpoints="allEndpointsCategorized" @input="filters.endpoints = $event"></EndpointChooser>

			<h4>Collections</h4>
			<Multiselect
				v-model="filters.collections" :options="optionCollections" trackBy="id" label="id"
				placeholder="Select from list, or type to search through IDs and titles"
				:internalSearch="false" @search-change="searchCollections" :option-height="66" :clearOnSelect="false"
				:taggable="true" @tag="addCollectionSearchTerm" @remove="potentiallyRemoveCollectionSearchTerm"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props">
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
				<template slot="option" slot-scope="props">
					<strong>{{props.option.id || '"'+props.search+'"'}}</strong>
					<span v-if="props.option.count">&nbsp;({{props.option.count}})</span>
					<p style="margin-bottom:0">{{props.option.summary || "&nbsp;"}}</p>
				</template>	
			</Multiselect>

			<h4>Input formats</h4>
			<Multiselect
			    v-model="filters.inputFormats" :options="searchedInputFormats" trackBy="format" label="format"
				placeholder="Select from list, or type to search"
				:internalSearch="false" @search-change="searchInputFormats"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props">
					{{props.option.format}} <span v-if="props.option.count">({{props.option.count}})</span>
				</template>
			</Multiselect>
			
			<h4>Output formats</h4>
			<Multiselect
			    v-model="filters.outputFormats" :options="searchedOutputFormats" trackBy="format" label="format"
				placeholder="Select from list, or type to search"
				:internalSearch="false" @search-change="searchOutputFormats"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props">
					{{props.option.format}} <span v-if="props.option.count">({{props.option.count}})</span>
				</template>
			</Multiselect>

			<h4>Service types</h4>
			<Multiselect
			    v-model="filters.serviceTypes" :options="searchedServiceTypes" trackBy="service" label="service"
				placeholder="Select from list, or type to search"
				:internalSearch="false" @search-change="searchServiceTypes"
				:multiple="true" :hideSelected="true" :closeOnSelect="false" :preserveSearch="true" openDirection="below">
				<template slot="option" slot-scope="props">
					{{props.option.service}} <span v-if="props.option.count">({{props.option.count}})</span>
				</template>
			</Multiselect>

			<h4>UDF runtimes</h4>
			<Multiselect
			    v-model="filters.udfRuntimes" :options="searchedUdfRuntimes" trackBy="runtime" label="runtime"
				placeholder="Select from list, or type to search"
				:internalSearch="false" @search-change="searchUdfRuntimes"
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
			searchedInputFormats: [],
			allOutputFormats: [],
			searchedOutputFormats: [],
			allServiceTypes: [],
			searchedServiceTypes: [],
			allUdfRuntimes: [],
			searchedUdfRuntimes: [],
			filters: {
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
				    // for every BackendGroup component
					this.noFilterMatches = this.$refs.backendGroupComponents.every(
						// test whether its HTML element has been entirely hidden due to the v-show
						bg => bg.$el.style.display == 'none'
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
			.then(response => { this.allInputFormats = response.data; this.searchInputFormats(""); })
			.catch(error => console.log(error));
		
		axios.get('/api/output_formats')
			.then(response => { this.allOutputFormats = response.data; this.searchOutputFormats(""); })
			.catch(error => console.log(error));

		axios.get('/api/service_types')
			.then(response => { this.allServiceTypes = response.data; this.searchServiceTypes(""); })
			.catch(error => console.log(error));

		axios.get('/api/udf_runtimes')
			.then(response => { this.allUdfRuntimes = response.data; this.searchUdfRuntimes(""); })
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
			let results = this.allProcesses.filter(p => {
				const textToSearch = (p.id + (p.allSummaries ? ' ' + p.allSummaries.join(' / ') : '')).toLowerCase();
				return queries.every(q => textToSearch.indexOf(q) != -1);
			});
			if (query.trim().length > 0) {
				results.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
			}
			this.searchedProcesses = results;
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
		},

		searchInputFormats(query) {
			const q = query.trim().toLowerCase();
			this.searchedInputFormats = this.allInputFormats.filter(f => f.format.toLowerCase().indexOf(q) !== -1);
			if (q.length > 0) {
				this.searchedInputFormats.sort((a, b) => a.format.localeCompare(b.format));
			}
		},

		searchOutputFormats(query) {
			const q = query.trim().toLowerCase();
			this.searchedOutputFormats = this.allOutputFormats.filter(f => f.format.toLowerCase().indexOf(q) !== -1);
			if (q.length > 0) {
				this.searchedOutputFormats.sort((a, b) => a.format.localeCompare(b.format));
			}
		},

		searchServiceTypes(query) {
			const q = query.trim().toLowerCase();
			this.searchedServiceTypes = this.allServiceTypes.filter(s => s.service.toLowerCase().indexOf(q) !== -1);
			if (q.length > 0) {
				this.searchedServiceTypes.sort((a, b) => a.service.localeCompare(b.service));
			}
		},

		searchUdfRuntimes(query) {
			const q = query.trim().toLowerCase();
			this.searchedUdfRuntimes = this.allUdfRuntimes.filter(r => r.runtime.toLowerCase().indexOf(q) !== -1);
			if (q.length > 0) {
				this.searchedUdfRuntimes.sort((a, b) => a.runtime.localeCompare(b.runtime));
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
