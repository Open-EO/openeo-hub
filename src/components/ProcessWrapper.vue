<template>
	<Process :processData="processData" :version="version" :initiallyCollapsed="initiallyCollapsed" :provideDownload="provideDownload">
		<template slot="process-before-details">
			<UnsuccessfulCrawlNotice :unsuccessfulCrawls="processData.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
			<DataRetrievedNotice :timestamp="processData.retrieved"></DataRetrievedNotice>
		</template>
	</Process>
</template>

<script>
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';
import { Process } from '@openeo/vue-components';

export default {
	name: 'ProcessWrapper',
	props: ['processData', 'version', 'initiallyCollapsed', 'provideDownload'],
	components: {
		Process,
		DataRetrievedNotice,
		UnsuccessfulCrawlNotice
    }
}
</script>

<style>
</style>