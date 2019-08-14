<template>
    <section id="search">
		<section id="search-forms">
			<nav>
				<ul>
					<li @click="searchPanel = 'backends'" :class="{active: searchPanel == 'backends'}">Backends</li>
					<li @click="searchPanel = 'collections'" :class="{active: searchPanel == 'collections'}">Collections</li>
					<li @click="searchPanel = 'processes'" :class="{active: searchPanel == 'processes'}">Processes</li>
				</ul>
			</nav>

			<div class="panelContainer" :class="{hidden: searchPanel != 'collections'} /* Don't use `v-show` for div that contains a Leaflet map - it would cause the map to be initiated incorrectly. Setting `height:0` (instead of v-show's `display:none`) solves the problem.*/">
				<CollectionSearch @search-collections="queryCollections"></CollectionSearch>
			</div>

			<div class="panelContainer" v-show="searchPanel == 'processes'">
				<ProcessSearch @search-processes="queryProcesses"></ProcessSearch>
			</div>
			
			<div class="panelContainer" v-show="searchPanel == 'backends'">
				<BackendSearch @search-backends="queryBackends"></BackendSearch>
			</div>
		</section>

		<section id="search-results">
			<nav>
				<ul>
					<li @click="resultPanel = 'backends'" :class="{active: resultPanel == 'backends'}">Backends</li>
					<li @click="resultPanel = 'collections'" :class="{active: resultPanel == 'collections'}">Collections</li>
					<li @click="resultPanel = 'processes'" :class="{active: resultPanel == 'processes'}">Processes</li>
				</ul>
			</nav>

			<div class="panelContainer" v-show="resultPanel == 'collections'">
				<CollectionResults :matchedCollections="matchedCollections" initialInstructionText='Use the "Collections" tab on the left side to compose a search.'></CollectionResults>
			</div>

			<div class="panelContainer" v-show="resultPanel == 'processes'">
				<ProcessResults :matchedProcesses="matchedProcesses" initialInstructionText='Use the "Processes" tab on the left side to compose a search.'></ProcessResults>
			</div>

			<div class="panelContainer" v-show="resultPanel == 'backends'">
				<BackendResults :matchedBackends="matchedBackends" initialInstructionText='Use the "Backends" tab on the left side to compose a search.'></BackendResults>
			</div>
		</section>
	</section>
</template>

<script>
import axios from 'axios';
import BackendSearch from './BackendSearch.vue';
import BackendResults from './BackendResults.vue';
import CollectionSearch from './CollectionSearch.vue';
import CollectionResults from './CollectionResults.vue';
import ProcessSearch from './ProcessSearch.vue';
import ProcessResults from './ProcessResults.vue';

export default {
	name: 'search-section',
	components: {
		BackendSearch,
		BackendResults,
		CollectionSearch,
		CollectionResults,
		ProcessSearch,
		ProcessResults
	},
	data() {
		return {
			searchPanel: 'backends',
			resultPanel: 'backends',
			matchedBackends: null,
			matchedCollections: null,
			matchedProcesses: null
		};
	},
	methods: {
		queryBackends(params) {
			axios.post('/backends/search', params)
				.then(response => {
					this.matchedBackends = response.data;
					this.resultPanel = 'backends';
				})
				.catch(error => {
					console.log(error);
				});
		},

		queryCollections(params) {
			axios.post('/collections/search', params)
				.then(response => {
					this.matchedCollections = response.data;
					this.resultPanel = 'collections';
				})
				.catch(error => {
					console.log(error);
				});
		},

		queryProcesses(params) {
			axios.post('/processes/search', params)
				.then(response => {
					this.matchedProcesses = response.data;
					this.resultPanel = 'processes';
				})
				.catch(error => {
					console.log(error);
				});
		}
	}
}
</script>

<style scoped>
</style>
