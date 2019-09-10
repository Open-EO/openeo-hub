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

			<h4>openEO API versions</h4>
			<input type="checkbox" v-model="filters.apiVersions" value="0.3" id="zerodot3"><label for="zerodot3">v0.3.x</label>
			<input type="checkbox" v-model="filters.apiVersions" value="0.4" id="zerodot4"><label for="zerodot4">v0.4.x</label>

			<h4>Functionalities</h4>
			<EndpointChooser class="compact" :categorizedEndpoints="allEndpointsCategorized" @input="filters.endpoints = $event"></EndpointChooser>

			<h4>Output formats</h4>
			<Multiselect
			    v-model="filters.outputFormats" :options="allOutputFormats" trackBy="format" label="format"
				:multiple="true" :hideSelected="true" :closeOnSelect="false"></Multiselect>

			<h4>Service types</h4>
			<Multiselect
			    v-model="filters.serviceTypes" :options="allServiceTypes" trackBy="service" label="service"
				:multiple="true" :hideSelected="true" :closeOnSelect="false"></Multiselect>
		
		    <h4>Billing</h4>
			<input type="checkbox" v-model="filters.excludeIfNoFreePlan" id="excludeIfNoFreePlan"><label for="excludeIfNoFreePlan">Exclude backends without a free plan</label>
		</section>
    </section>
</template>

<script>
import axios from 'axios';
import BackendGroup from './BackendGroup.vue';
import Multiselect from 'vue-multiselect';
import { FeatureList } from '@openeo/js-commons';
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
			allEndpointsCategorized: FeatureList.features,
			allOutputFormats: [],
			allServiceTypes: [],
			filters: {
				apiVersions: [],
				excludeIfNoFreePlan: false,
				endpoints: [],
				outputFormats: [],
				serviceTypes: []
			}
		};
	},
	mounted() {
		axios.get('/api/backends?details=grouped')
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

		axios.get('/service_types')
			.then(response => this.allServiceTypes = response.data)
			.catch(error => console.log(error));
	},
	methods: {
		checkFilters(backends) {
			return [
				// APIVERSIONS
				// connect versions with AND:
				this.filters.apiVersions.every(v => backends.some(b => b.api_version && b.api_version.substr(0,3) == v)),
				// connect versions with OR:
				// backends.some(b => b.api_version && this.filters.apiVersions.some(v => (b.api_version).substr(0,3) == v)),
				
				// EXCLUDEIFNOFREEPLAN
				// exclude if *every* plan of *every* backend of the group is set to "paid=true" (more appropriate IMO)
				!this.filters.excludeIfNoFreePlan || !backends.every(b => b.billing && Array.isArray(b.billing.plans) && b.billing.plans.every(p => p.paid == true)),
				// include if at least one plan of the group *has* billing information and in there has a plan with "paid=false"
				// !this.filters.excludeIfNoFreePlan || backends.some(b => b.billing && Array.isArray(b.billing.plans) && b.billing.plans.some(p => p.paid == false || p.name == 'free')),
				
				// ENDPOINTS
				backends.some(b => b.endpoints && this.filters.endpoints.every(e1 => b.endpoints.some(e2 =>
				    e2.methods.map(m => m.toLowerCase()).indexOf(e1.split(' ')[0]) != -1 && e2.path.toLowerCase().replace(/{[^}]*}/g, '{}') == e1.split(' ')[1]
				))),
				
				// OUTPUTFORMATS
				backends.some(b => b.outputFormats && this.filters.outputFormats.every(of => Object.keys(b.outputFormats.formats || b.outputFormats).indexOf(of.format) != -1)),
				
				// SERVICETYPES
				backends.some(b => b.serviceTypes && this.filters.serviceTypes.every(st => Object.keys(b.serviceTypes).indexOf(st.service) != -1))
			].every(f => f == true);
		}
	}
}
</script>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

<style scoped>
</style>
