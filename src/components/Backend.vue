<template>
	<div class="backend">
        <h3>{{backend.backend}}</h3>
        <dl>
            <dt><h4>Version</h4></dt>
            <dd>{{backend.version}}</dd>

            <dt v-if="functionalities" @click="collapsed.functionalities = !collapsed.functionalities">
                <h4>{{collapsed.functionalities ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'Supported'}} functionalities ({{supportedFunctionalitiesCount}})</h4>
            </dt>
            <dd v-if="functionalities && !collapsed.functionalities">
                <ul class="functionalities">
                    <li v-for="(yesno, functionality) in functionalities" :key="functionality">{{yesno ? '✔️' : '❌'}} {{functionality}}</li>
                </ul>
            </dd>

            <dt v-if="backend.collections" @click="collapsed.collections = !collapsed.collections">
                <h4>{{collapsed.collections ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} collections ({{backend.collections.length}})</h4>
            </dt>
            <dd v-if="backend.collections && !collapsed.collections">
                <Collection v-for="collection in preparedBackend.collections" :key="collection.name" :collection="collection" initiallyCollapsed="true"></Collection>
            </dd>
            
            <dt v-if="backend.processes" @click="collapsed.processes = !collapsed.processes">
                <h4>{{collapsed.processes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} processes ({{backend.processes.length}})</h4>
            </dt>
            <dd v-if="preparedBackend.processes && !collapsed.processes">
                <Process v-for="process in backend.processes" :key="process.name || process.id" :process="convertProcessToLatestSpec(process)" :baseConfig="{processesInitiallyCollapsed:true}"></Process>
            </dd>

            <dt v-if="backend.outputFormats" @click="collapsed.outputFormats = !collapsed.outputFormats">
                <h4>{{collapsed.outputFormats ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} output formats ({{Object.keys(backend.outputFormats).length}})</h4>
            </dt>
            <dd v-if="backend.outputFormats && !collapsed.outputFormats">
                <ul class="output-formats">
                    <li v-for="of in preparedBackend.outputFormats" :key="of">{{of}}</li>
                </ul>
            </dd>

            <dt v-if="backend.serviceTypes" @click="collapsed.serviceTypes = !collapsed.serviceTypes">
                <h4>{{collapsed.serviceTypes ? '▶' : '▼'}} {{isSearchResult ? 'Matched' : 'All'}} service types ({{Object.keys(backend.serviceTypes).length}})</h4>
            </dt>
            <dd v-if="backend.serviceTypes && !collapsed.serviceTypes">
                <ul class="service-types">
                    <li v-for="st in preparedBackend.serviceTypes" :key="st">{{st}}</li>
                </ul>
            </dd>
        </dl>
        <div class="retrieved">
            <DataRetrievedNotice :timestamp="backend.retrieved"></DataRetrievedNotice>
        </div>
    </div>
</template>

<script>
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import { Process, Utils as DocGenUtils } from '@openeo/processes-docgen';
import Collection from './Collection.vue';
import { OPENEO_V0_3_1_FUNCTIONALITIES } from './../const.js'

export default {
	name: 'Backend',
	props: ['backend', 'initiallyCollapsed', 'isSearchResult'],
	components: {
        DataRetrievedNotice,
        Collection,
        Process
    },
    computed: {
        preparedBackend() {
            if(this.isSearchResult) {
                // don't touch search result because order may be important
                return this.backend;
            } else {
                // when we get a long list for the discovery section having it sorted alphabetically is very handy
                var original = this.backend;
                // endpoints are not sorted because the initial search order is already good
                original.collections = original.collections.sort((c1, c2) => c1.name.toLowerCase() > c2.name.toLowerCase());
                original.processes = original.processes.sort((p1, p2) => p1.name.toLowerCase() > p2.name.toLowerCase());
                original.outputFormats = Object.keys(original.outputFormats).sort((of1, of2) => of1.toLowerCase() > of2.toLowerCase());
                original.serviceTypes = Object.keys(original.serviceTypes).sort((st1, st2) => st1.toLowerCase() > st2.toLowerCase());
                return original;
            }
        },
        functionalities() {
            if(!this.backend.endpoints) {
                return undefined;
            } else {
                let yesno = Object.assign({}, OPENEO_V0_3_1_FUNCTIONALITIES);

                Object.keys(yesno).forEach(key =>  // for each functionality
                    yesno[key] = yesno[key].every(endpoint =>  // to be labelled "supported", ALL endpoints of the functionality must be supported
                        this.backend.endpoints.some(e =>  // the functionality's endpoint must be found in the returned endpoints array
                            e.match(new RegExp(endpoint.replace(/{[^}]+}/g, '{[^}]+}')))  // allow arbitrary parameter names (aka don't care about content in curly brackets)
                        )
                    )
                );

                if(this.isSearchResult) {
                    // "filter" out all false values (if it was a search, we don't care about we *didn't* find)
                    Object.keys(yesno).forEach(key => {
                        if(!yesno[key]) {
                            delete yesno[key];
                        }
                    });
                }

                return yesno;

                // solution that returns array of supported functionalities (but doesn't include unsupported ones and doesn't map to true/false)
                /*
                return Object.keys(OPENEO_V0_3_1_FUNCTIONALITIES).filter(func =>  // filter functionality names
                    OPENEO_V0_3_1_FUNCTIONALITIES[func].every(endpoint =>  // rest as above
                        this.backend.endpoints.some(e =>
                            e.match(new RegExp(endpoint.replace(/{[^}]+}/g, '{[^}]+}')))
                        )
                    )
                );
                */
            }
        },
        supportedFunctionalitiesCount() {
            const supported = Object.values(this.functionalities).reduce((sum, currentValue) => sum + (currentValue == true ? 1 : 0), 0);
            const total = Object.keys(OPENEO_V0_3_1_FUNCTIONALITIES).length;
            if(this.isSearchResult) {
                return supported;
            } else {
                return supported + '/' + total;
            }
        }
    },
	data() {
		return {
			collapsed: {
                root: this.initiallyCollapsed || false,
                functionalities: true,
                collections: true,
                processes: true,
                outputFormats: true,
                serviceTypes: true
            }
		};
    },
    methods: {
        convertProcessToLatestSpec(proc) {
            return DocGenUtils.convertProcessToLatestSpec(proc);
        }
    }
}
</script>

<style scoped>
h4 {
    cursor: pointer;
}
ul.functionalities {
    list-style: none;
}
ul.output-formats,
ul.service-types {
    column-width: 10em;
}
</style>
