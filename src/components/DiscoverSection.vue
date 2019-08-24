<template>
    <section id="discover">
		<section id="discover-list">
			<p>This is a list of all available openEO backends:</p>
			<ul>
				<li v-for="group in allBackendGroups" :key="group.name" v-show="checkFilters(group.backends)" >
					<BackendGroup :groupName="group.name" :backends="group.backends"></BackendGroup>
				</li>
			</ul>
		</section>

		<section id="discover-filters">
			<h3>Filters</h3>
			<h4>Output formats</h4>
			<Multiselect
			    v-model="filters.outputFormats" :options="allOutputFormats" trackBy="format" label="format"
				:multiple="true" :hideSelected="true" :closeOnSelect="false"></Multiselect>
		</section>
    </section>
</template>

<script>
import axios from 'axios';
import BackendGroup from './BackendGroup.vue';
import Multiselect from 'vue-multiselect'

export default {
	name: 'discover-section',
	components: {
		BackendGroup,
		Multiselect
	},
	data() {
		return {
			allBackendGroups: [],
			allOutputFormats: [],
			filters: {
				outputFormats: []
			}
		};
	},
	mounted() {
		axios.get('/backends?details=grouped')
			.then(response => {
				var result = response.data;
				result.sort((a, b) => {
					return a.name.toLowerCase().localeCompare(b.name.toLowerCase());  // ascending by name
				}).map(e => e.backends.sort((a, b) => {
					var aVersion = (a.api_version || a.version || "0.0.0").split('.');
					var bVersion = (b.api_version || b.version || "0.0.0").split('.');
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
		
		axios.get('/output_formats')
			.then(response => this.allOutputFormats = response.data)
			.catch(error => console.log(error));
	},
	methods: {
		checkFilters(backends) {
			return backends.some(b => b.outputFormats && this.filters.outputFormats.every(of => Object.keys(b.outputFormats.formats || b.outputFormats).indexOf(of.format) != -1));
		}
	}
}
</script>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

<style scoped>
</style>
