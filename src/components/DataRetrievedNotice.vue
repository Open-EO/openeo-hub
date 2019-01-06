<template>
    <div class="retrieved" v-if="timestamp != undefined">
        <em>This data was cached at <FormattedTimestamp :timestamp="timestamp"></FormattedTimestamp>.</em>
    </div>
</template>

<script>
import FormattedTimestamp from './FormattedTimestamp.vue';
export default {
    name: 'DataRetrievedNotice',
    components: { FormattedTimestamp },
    props: ['timestamp']
}
</script>

<style scoped>
</style>
