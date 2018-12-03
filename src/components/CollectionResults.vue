<template>
    <div>
        <h2>Results from collection search ({{matchedCollections.length}})</h2>
        <em v-if="matchedCollections.length == 0" class="emptyNotice">empty</em>
        <ol>
            <li v-for="collection in matchedCollections" :key="collection.collection.backend+'/'+collection.collection.name" class="collectionPanelParent">
                <CollectionPanel :collection="collection.collection"></CollectionPanel>
            </li>
        </ol>
    </div>
</template>

<script>
import CollectionPanel from './CollectionPanel.vue';

export default {
    name: 'CollectionResults',
    components: { CollectionPanel },
    props: ['matchedCollections']
}
</script>

<style>
</style>
