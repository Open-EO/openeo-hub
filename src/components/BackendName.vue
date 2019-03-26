<template>
    <span class="backendname" v-if="data.backendUrl">
        <em :title="data.backendUrl">
            {{data.backendTitle}}
        </em>
        <template v-if="data.version">
            | v{{data.version}}
        </template>
        <span v-if="needsWarningSign" :title="warningText">️⚠</span>
    </span>
</template>

<script>
import {default as config} from './../../config.json';

export default {
    name: 'BackendName',
    props: ['data'],
    computed: {
        recentlyUnavailable() {
            return this.data.unsuccessfulCrawls >= config.unsuccessfulCrawls.flagAfter;
        },
        recentlyUnavailableText() {
            return this.recentlyUnavailable ? 'This backend was recently unavailable for crawling.' : '';
        },
        oldData() {
            return (new Date() - new Date(this.data.retrieved)) >= config.flagWhenOlderThanXHours * 60 * 60 * 1000;
        },
        oldDataText() {
            return this.oldData ? 'This data was cached more than ' + config.flagWhenOlderThanXHours + ' hours ago.' : '';
        },
        needsWarningSign() {
            return this.recentlyUnavailable || this.oldData;
        },
        warningText() {
            return [this.recentlyUnavailableText, this.oldDataText].join(' ');
        }
    }
}
</script>

<style scoped>
</style>
