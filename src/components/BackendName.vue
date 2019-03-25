<template>
    <span class="backendname" v-if="data.backendUrl">
        <em :title="data.backendUrl">
            {{data.backendTitle}}
        </em>
        <template v-if="data.version">
            | v{{data.version}}
        </template>
    </span>
</template>

<script>
export default {
    name: 'BackendName',
    props: ['data']
}
</script>

<style scoped>
</style>
