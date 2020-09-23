<template>
	<div class="backendGroup" :class="{collapsed: collapsed}" v-show="doesAnyFilterMatch()">
        <h3 @click="toggleCollapsed">
            {{collapsed ? '▸' : '▾'}}
            {{groupName}}
        </h3>

        <div v-show="!collapsed">
            <Tabs :id="groupName" :pills="true" ref="tabsComponent">
                <Tab v-for="(backend, index) in backends" :key="backend.backendUrl" :id="'version-'+backend.backendUrl" :name="tabTitle(backend)" :selected="index == 0" :enabled="checkFilters(backend)">
                    <Backend :backendData="backend" :collapsible="false" :showVersion="false"></Backend>
                </Tab>
            </Tabs>
        </div>
    </div>
</template>

<script>
import Backend from './Backend.vue';
import { Tab, Tabs } from '@openeo/vue-components';
import {default as config} from './../../config.json';
import { MigrateCapabilities } from '@openeo/js-commons';

export default {
    name: 'BackendGroup',
    components: {
        Backend,
        Tab,
        Tabs
    },
	props: ['groupName', 'backends', 'filters'],
	data() {
		return {
            collapsed: true
		};
    },
    methods: {
        toggleCollapsed() {
            this.collapsed = !this.collapsed;
            if (typeof this.$refs.tabsComponent.adjustSizes === 'function') {
                this.$nextTick(this.$refs.tabsComponent.adjustSizes);
            }
        },
        tabTitle(backend) {
            return 'v'+backend.api_version + (this.needsWarningSign(backend) ? ' ⚠':'');
        },
        recentlyUnavailable(backend) {
            return backend.unsuccessfulCrawls >= config.unsuccessfulCrawls.flagAfter;
        },
        oldData(backend) {
            return (new Date() - new Date(backend.retrieved)) >= config.flagWhenOlderThanXHours * 60 * 60 * 1000;
        },
        needsWarningSign(backend) {
            return this.recentlyUnavailable(backend) || this.oldData(backend);
        },
        doesAnyFilterMatch() {
            return this.backends.some(b => this.checkFilters(b));
        },
        checkFilters(b) {
            // Little heads-up in case you're looking for the history of this method: It was previously located in the DiscoverSection component.
			return [
				// APIVERSIONS (OR)
				this.filters.apiVersions.length == 0 || (b.api_version && this.filters.apiVersions.some(v => b.api_version.substr(0,3) == v)),
				
				// EXCLUDEIFNOFREEPLAN
				// exclude if *every* plan of *every* backend of the group is set to "paid=true" (more appropriate IMO)
				// !this.filters.excludeIfNoFreePlan || !backends.every(b => b.billing && Array.isArray(b.billing.plans) && b.billing.plans.every(p => p.paid == true)),
				// include if at least one plan of the group *has* billing information and in there has a plan with "paid=false"
				!this.filters.excludeIfNoFreePlan || (b.billing && Array.isArray(b.billing.plans) && b.billing.plans.some(p => p.paid == false)),
				
				// ENDPOINTS (AND)
				this.filters.endpoints.length == 0 || ((b => {  // Immediately-invoked Function Expression (IIFE), see below
					if(!b.endpoints) {
						return false;
					} else {
						var convertedEndpoints = MigrateCapabilities.convertEndpointsToLatestSpec(b.endpoints, b.api_version, true);
						return this.filters.endpoints.every(e1 => convertedEndpoints.some(e2 =>
							e2.methods.map(m => m.toLowerCase()).indexOf(e1.split(' ')[0]) != -1 &&
							e2.path.toLowerCase().replace(/{[^}]*}/g, '{}') == e1.split(' ')[1].toLowerCase().replace(/{[^}]*}/g, '{}')
						))
					}
				})(b)),  // function expression is immediately invoked HERE

				// COLLECTIONS (OR)
				this.filters.collections.length == 0 || (b.collections && this.filters.collections.some(c1 => b.collections.some(c2 => 
					c1.isSearchterm ? c1.matches.indexOf(c2.id) != -1 : c1.id == c2.id
				))),
				
				// PROCESSES (AND)
				this.filters.processes.length == 0 || (b.processes && this.filters.processes.every(p1 => b.processes.some(p2 => 
					p1.isSearchterm ? p1.matches.indexOf(p2.id) != -1 : p1.id == p2.id
				))),

				// INPUTFORMATS (OR)
				this.filters.inputFormats.length == 0 || (b.fileFormats && this.filters.inputFormats.some(ff => Object.keys(b.fileFormats.input).indexOf(ff.format) != -1)),
				
				// OUTPUTFORMATS (OR)
				this.filters.outputFormats.length == 0 || (b.fileFormats && this.filters.outputFormats.some(ff => Object.keys(b.fileFormats.output).indexOf(ff.format) != -1)),
				
				// SERVICETYPES (OR)
				this.filters.serviceTypes.length == 0 || (b => b.serviceTypes && this.filters.serviceTypes.some(st => Object.keys(b.serviceTypes).indexOf(st.service) != -1)),

				// UDF RUNTIMES (OR)
				this.filters.udfRuntimes.length == 0 || (b.udfRuntimes && this.filters.udfRuntimes.some(rt => Object.keys(b.udfRuntimes).indexOf(rt.runtime) != -1))
			].every(f => f == true);
		}
    }
}
</script>

<style scoped>
h3 {
    cursor: pointer;
}

.backendGroup > div {
    padding-left: 40px;
}
</style>

<style>
.tabsHeader {
    margin-bottom: 10px;
}
.tabs .tabsBody {
    overflow: visible;
}
</style>
