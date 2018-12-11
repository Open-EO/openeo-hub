<template>
    <div>
        <h2>Results from collection search {{(matchedCollections ? '('+matchedCollections.length+')' : '')}}</h2>
        <em v-if="matchedCollections == null" class="emptyNotice">{{initialInstructionText}}</em>
        <em v-else-if="matchedCollections.length == 0" class="emptyNotice">No search results.</em>
        <ol>
            <li v-for="collection in matchedCollections" :key="collection.backend+'/'+collection.name" class="collectionPanelParent">
                <Collection :collection="collection" :initiallyCollapsed="true"></Collection>
            </li>
        </ol>
    </div>
</template>

<script>
import Collection from './Collection.vue';

export default {
    name: 'CollectionResults',
    components: { Collection },
    props: ['matchedCollections', 'initialInstructionText']
}
</script>

<style>
</style>
