<template>
    <div>
        <h2>Results from process search ({{matchedProcesses.length}})</h2>
        <em v-if="matchedProcesses.length == 0" class="emptyNotice">empty</em>
        <ol>
            <li v-for="process in matchedProcesses" :key="process.process.backend+'/'+process.process.name" class="processPanelParent">
                <ProcessPanel :process="convertProcessToLatestSpec(process.process)"></ProcessPanel>
            </li>
        </ol>
    </div>
</template>

<script>
import { ProcessPanel, utils as DocGenUtils } from '@openeo/processes-docgen';

export default {
    name: 'ProcessResults',
    components: { ProcessPanel },
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
