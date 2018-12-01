<template>
    <div>
        <h2>Results from process search</h2>
        <em v-if="matchedProcesses.length == 0">empty</em>
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
