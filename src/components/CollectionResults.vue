<template>
    <div>
        <h2>Results from collection search</h2>
        <em v-if="matchedCollections.length == 0">empty</em>
        <ol>
            <li v-for="collection in matchedCollections" :key="collection.collection.backend+'/'+collection.collection.name">
                {{collection.collection.name}}
            </li>
        </ol>
    </div>
</template>

<script>
export default {
    name: 'CollectionResults',
    props: ['matchedCollections']
}
</script>

<style>
</style>
