<template>
    <div>
        <h2>Results from process search ({{matchedProcesses.length}})</h2>
        <em v-if="matchedProcesses.length == 0" class="emptyNotice">empty</em>
        <ol>
            <li v-for="process in matchedProcesses" :key="process.backend+'/'+process.name" class="processParent">
                <Process :process="convertProcessToLatestSpec(process)" :baseConfig="{processesInitiallyCollapsed:true}">
                    <div slot="process-after-summary" class="backendname">
                        <em>{{process.backend}}</em>
                    </div>
                    <div slot="process-after-details" class="retrieved">
 			            <DataRetrievedNotice :timestamp="process.retrieved"></DataRetrievedNotice>
                    </div>
                </Process>
            </li>
        </ol>
    </div>
</template>

<script>
import { Process, Utils as DocGenUtils } from '@openeo/processes-docgen';
import DataRetrievedNotice from './DataRetrievedNotice.vue';

export default {
    name: 'ProcessResults',
    components: { Process, DataRetrievedNotice },
    props: ['matchedProcesses'],
    methods: {
        convertProcessToLatestSpec(proc) {
            return DocGenUtils.convertProcessToLatestSpec(proc);
        }
    }
}
</script>

<style>
</style>
