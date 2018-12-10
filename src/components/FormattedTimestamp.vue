<template>
    <span>{{formatted}} UTC ({{ago}})</span>
</template>

<script>
import * as moment from 'moment';

export default {
    name: 'FormattedTimestamp',
    props: ['timestamp'],
    computed: {
        asMoment() {
            return moment(this.timestamp).utc();  // without `.utc()` it would use the local timezone!
        },
        formatted() {
            return this.asMoment.format('YYYY-MM-DD HH:mm');
        },
        ago() {
            return this.asMoment.fromNow();
        }
    }
}
</script>

<style scoped>
</style>
