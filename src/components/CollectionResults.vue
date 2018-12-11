<template>
    <div>
        <h2>Results from collection search {{(matchedCollections ? '('+matchedCollections.length+')' : '')}}</h2>
        <em v-if="matchedCollections == null" class="emptyNotice">{{initialInstructionText}}</em>
        <em v-else-if="matchedCollections.length == 0" class="emptyNotice">No search results.</em>
        <ol>
            <li v-for="collection in matchedCollections" :key="collection.backend+'/'+collection.name" class="collectionPanelParent">
                <CollectionPanel :collection="collection" :initiallyCollapsed="true"></CollectionPanel>
            </li>
        </ol>
    </div>
</template>

<script>
import CollectionPanel from './CollectionPanel.vue';

export default {
    name: 'CollectionResults',
    components: { CollectionPanel },
    props: ['matchedCollections', 'initialInstructionText']
}
</script>

<style>
</style>
