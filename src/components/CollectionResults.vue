<template>
    <div>
        <h2>Results from collection search {{(matchedCollections ? '('+matchedCollections.length+')' : '')}}</h2>
        <em v-if="matchedCollections == null" class="emptyNotice">{{initialInstructionText}}</em>
        <em v-else-if="matchedCollections.length == 0" class="emptyNotice">No search results.</em>
        <ol>
            <li v-for="collection in matchedCollections" :key="collection.backendUrl+'/'+collection.name" class="collectionParent">
                <CollectionWrapper :collectionData="collection" :initiallyCollapsed="true"></CollectionWrapper>
            </li>
        </ol>
    </div>
</template>

<script>
import CollectionWrapper from './CollectionWrapper.vue';

export default {
    name: 'CollectionResults',
    components: { CollectionWrapper },
    props: ['matchedCollections', 'initialInstructionText']
}
</script>

<style>
</style>
