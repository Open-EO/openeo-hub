<template>
    <div>
        <h2>Results from backend search</h2>
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
                            <ProcessPanel v-for="process in backend.processes" :key="process.name || process.id" :process="convertProcessToLatestSpec(process)"></ProcessPanel>
                        </dd>
                    </dl>
                </li>
            </ol>
        </output>
    </div>
</template>

<script>
import { ProcessPanel, utils as DocGenUtils } from '@openeo/processes-docgen';
import CollectionPanel from './CollectionPanel.vue';

export default {
    name: 'BackendResults',
    components: {
        CollectionPanel,
        ProcessPanel
    },
    props: ['matchedBackends'],
    methods: {
        convertProcessToLatestSpec(proc) {
            return DocGenUtils.convertProcessToLatestSpec(proc);
        }
    }
}
</script>

<style>
</style>
