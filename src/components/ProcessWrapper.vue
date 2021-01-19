<template>
	<Process :process="processData" :version="version" :initiallyCollapsed="initiallyCollapsed" :provideDownload="provideDownload">
	</Process>
</template>

<script>
import Process from '@openeo/vue-components/components/Process.vue';

export default {
	name: 'ProcessWrapper',
	props: ['processData', 'version', 'initiallyCollapsed', 'provideDownload'],
	components: {
		Process,
    }
}
</script>

<style>
</style>