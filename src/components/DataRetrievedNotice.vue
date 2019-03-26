<template>
    <div class="retrieved" v-if="timestamp != undefined">
        <small><em>This data was cached at <FormattedTimestamp :timestamp="timestamp"></FormattedTimestamp>.</em></small>
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
.retrieved {
    color: gray;
}
</style>
