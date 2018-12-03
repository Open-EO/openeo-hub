<template>
    <div>
        <em v-if="matchedProcesses.length == 0">empty</em>
        <h2>Results from process search ({{matchedProcesses.length}})</h2>
        <ol>
            <li v-for="process in matchedProcesses" :key="process.process.backend+'/'+process.process.name">
                {{process.process.backend}} &ndash; {{process.process.name}}
            </li>
        </ol>
    </div>
</template>

<script>
export default {
	name: 'ProcessResults',
    props: ['matchedProcesses']
}
</script>

<style>
</style>
