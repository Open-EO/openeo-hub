<template>
    <div>
        <h2>Results from process search {{(matchedProcesses ? '('+matchedProcesses.length+')' : '')}}</h2>
        <em v-if="matchedProcesses == null" class="emptyNotice">{{initialInstructionText}}</em>
        <em v-else-if="matchedProcesses.length == 0" class="emptyNotice">No search results.</em>
        <ol>
            <li v-for="process in matchedProcesses" :key="process.backendUrl+'/'+process.id" class="processParent">
                <ProcessWrapper :processData="process" :initiallyCollapsed="true" :provideDownload="false"></ProcessWrapper>
            </li>
        </ol>
    </div>
</template>

<script>
import ProcessWrapper from './ProcessWrapper.vue';

export default {
    name: 'ProcessResults',
    components: { ProcessWrapper },
    props: ['matchedProcesses', 'initialInstructionText']
}
</script>

<style>
</style>
