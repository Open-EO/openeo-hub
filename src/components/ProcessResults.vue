<template>
    <div>
        <h2>Results from process search {{(matchedProcesses ? '('+matchedProcesses.length+')' : '')}}</h2>
        <em v-if="preparedProcesses == null" class="emptyNotice">{{initialInstructionText}}</em>
        <em v-else-if="matchedProcesses.length == 0" class="emptyNotice">No search results.</em>
        <ol>
            <li v-for="process in matchedProcesses" :key="process.backend+'/'+(process.id||process.name)" class="processParent">
                <Process :process="process" :baseConfig="{processesInitiallyCollapsed:true}">
                    <template slot="process-after-summary">
                        <div class="backendname">
                            <em>{{process.backend}}</em>
                        </div>
                        <UnsuccessfulCrawlNotice :unsuccessfulCrawls="process.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
                    </template>
                    <template slot="process-after-details">
                        <DataRetrievedNotice :timestamp="process.retrieved"></DataRetrievedNotice>
                    </template>
                </Process>
            </li>
        </ol>
    </div>
</template>

<script>
import { Process, Utils as DocGenUtils } from '@openeo/processes-docgen';
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';

export default {
    name: 'ProcessResults',
    components: { Process, DataRetrievedNotice, UnsuccessfulCrawlNotice },
    props: ['matchedProcesses', 'initialInstructionText'],
    computed: {
        preparedProcesses() {
            return Array.isArray(this.matchedProcesses) ? this.matchedProcesses.map(DocGenUtils.normalizeProcess.bind(DocGenUtils)) : null;
        }
    }
}
</script>

<style>
</style>
