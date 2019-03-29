<template>
    <div class="retrievedNotice" v-if="timestamp != undefined && needsNotice()">
        This data was cached at <FormattedTimestamp :timestamp="timestamp"></FormattedTimestamp>.
    </div>
</template>

<script>
import {default as config} from './../../config.json';
import FormattedTimestamp from './FormattedTimestamp.vue';
export default {
    name: 'DataRetrievedNotice',
    components: { FormattedTimestamp },
    props: ['timestamp'],
    methods: {
        needsNotice() {
            return (new Date() - new Date(this.timestamp)) >= config.flagWhenOlderThanXHours * 60 * 60 * 1000;
        }
    }
}
</script>

<style scoped>
div.retrievedNotice {
    color: firebrick;
    margin-top: 10px;
}
</style>
