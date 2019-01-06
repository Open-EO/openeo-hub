<template>
    <div v-if="needsFlag()" class="unsuccessfulCrawlNotice">
        ⚠️ recently unavailable
    </div>
</template>

<script>
import {default as config} from './../../config.json';

export default {
    name: 'UnsuccessfulCrawlNotice',
    props: ['unsuccessfulCrawls'],
    methods: {
        needsFlag() {
            return this.unsuccessfulCrawls >= config.unsuccessfulCrawls.flagAfter;
        }
    }
}
</script>

<style scoped>
div.unsuccessfulCrawlNotice {
    color: firebrick;
}
</style>
