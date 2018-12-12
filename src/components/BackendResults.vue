<template>
    <div>
        <h2>Results from backend search {{(matchedBackends ? '('+matchedBackends.length+')' : '')}}</h2>
        <em v-if="matchedBackends == null" class="emptyNotice">{{initialInstructionText}}</em>
        <em v-else-if="matchedBackends.length == 0" class="emptyNotice">No search results.</em>
        <ol class="searchresults">
            <li v-for="backend in matchedBackends" :key="backend.backend" class="backendParent">
                <Backend :backend="backend" :initiallyCollapsed="true" :isSearchResult="true"></Backend>
            </li>
        </ol>
    </div>
</template>

<script>
import Backend from './Backend.vue';

export default {
    name: 'BackendResults',
    components: { Backend },
    props: ['matchedBackends', 'initialInstructionText']
}
</script>

<style>
</style>
